from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user, log_audit, require_roles
from app.models.models import Claim, FraudDetection, Investigation, InvestigationNote, Notification, User
from app.schemas.schemas import PaginatedResponse

router = APIRouter()

class ReviewActionPayload(BaseModel):
    action: str  # UNDER_REVIEW, CLEAR, ESCALATE, ASSIGN
    assigned_analyst: Optional[str] = None
    note: Optional[str] = None

@router.get("", response_model=PaginatedResponse)
def get_review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    fraud_type: Optional[str] = None,
    status: Optional[str] = None,
    provider_id: Optional[str] = None,
    analyst: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    # Only claims that have medium, high, or critical risk or status in review/escalated
    query = db.query(Claim).filter(
        or_(
            Claim.risk_level.in_(["MEDIUM", "HIGH", "CRITICAL"]),
            Claim.claim_status.in_(["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "ESCALATED", "REVIEW_REQUIRED"])
        )
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Claim.claim_id.ilike(s),
            Claim.patient_id.ilike(s),
            Claim.provider_id.ilike(s)
        ))

    if risk_level:
        query = query.filter(Claim.risk_level == risk_level.upper())

    if status:
        query = query.filter(Claim.claim_status == status.upper())

    if provider_id:
        query = query.filter(Claim.provider_id == provider_id)

    if analyst:
        query = query.filter(Claim.assigned_analyst.ilike(f"%{analyst}%"))

    if fraud_type:
        # Filter by detected fraud rule
        subq = db.query(FraudDetection.claim_id).filter(
            FraudDetection.rule_code == fraud_type.upper(),
            FraudDetection.triggered == True
        ).subquery()
        query = query.filter(Claim.claim_id.in_(subq))

    total = query.count()
    claims = query.order_by(desc(Claim.hybrid_score), desc(Claim.created_at))\
                  .offset((page - 1) * page_size)\
                  .limit(page_size)\
                  .all()

    total_pages = (total + page_size - 1) // page_size

    # Enrich with detected rules
    claim_ids = [c.claim_id for c in claims]
    detections = db.query(FraudDetection).filter(
        FraudDetection.claim_id.in_(claim_ids),
        FraudDetection.triggered == True
    ).all()

    rules_by_claim = {}
    for d in detections:
        rules_by_claim.setdefault(d.claim_id, []).append(d.rule_code)

    items = []
    for c in claims:
        items.append({
            "claim_id": c.claim_id,
            "patient_id": c.patient_id,
            "provider_id": c.provider_id,
            "claimed_amount": c.claimed_amount,
            "expected_amount": c.expected_amount,
            "risk_score": c.risk_score,
            "ml_anomaly_score": c.ml_anomaly_score,
            "hybrid_score": c.hybrid_score,
            "risk_level": c.risk_level,
            "detected_rules": rules_by_claim.get(c.claim_id, []),
            "assigned_analyst": c.assigned_analyst,
            "claim_status": c.claim_status,
            "created_at": c.created_at,
            "service_date": c.service_date
        })

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.put("/{claim_id}")
def update_review_action(
    claim_id: str,
    payload: ReviewActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    action = payload.action.upper()
    old_status = claim.claim_status
    inv_id = None

    if action == "UNDER_REVIEW":
        claim.claim_status = "UNDER_REVIEW"
        log_audit(db, current_user.email, "CLAIM_MOVED_TO_UNDER_REVIEW", "CLAIM", claim_id, {
            "claim_id": claim_id,
            "role": current_user.role,
            "user": current_user.email,
            "old_status": old_status,
            "new_status": "UNDER_REVIEW",
            "note": payload.note
        })
    elif action in ["CLEAR", "CLEARED"]:
        claim.claim_status = "CLEARED"
        log_audit(db, current_user.email, "CLAIM_CLEARED", "CLAIM", claim_id, {
            "claim_id": claim_id,
            "role": current_user.role,
            "user": current_user.email,
            "old_status": old_status,
            "new_status": "CLEARED",
            "note": payload.note
        })
    elif action in ["ESCALATE", "ESCALATED"]:
        claim.claim_status = "ESCALATED"
        # 1. Create or find investigation record
        inv = db.query(Investigation).filter(Investigation.claim_id == claim_id).first()
        if not inv:
            inv_count = db.query(Investigation).count() + 1
            inv = Investigation(
                claim_id=claim_id,
                case_number=f"INV-2026-{inv_count:04d}",
                status="OPEN",
                priority="CRITICAL" if claim.risk_level == "CRITICAL" else ("HIGH" if claim.risk_level == "HIGH" else "MEDIUM"),
                assigned_to="Elena Rostova (Investigator)",
                investigator="Elena Rostova (investigator@fraudguard.demo)",
                summary=f"Claim {claim_id} escalated for investigation by Fraud Analyst {current_user.email}. Note: {payload.note or 'Flagged for SIU review'}"
            )
            db.add(inv)
            db.commit()
            db.refresh(inv)
        else:
            inv.status = "OPEN"
            db.commit()

        inv_id = inv.id

        # 2. Add initial note if provided
        if payload.note:
            note_entry = InvestigationNote(
                investigation_id=inv.id,
                author_email=current_user.email,
                author_role=current_user.role,
                note_type="OBSERVATION",
                content=f"Escalation note from Fraud Analyst: {payload.note}"
            )
            db.add(note_entry)

        # 3. Create notification for Investigator
        notif = Notification(
            user_role="Investigator",
            title=f"Claim Escalated: {claim_id}",
            message=f"Claim {claim_id} has been escalated for investigation.",
            notification_type="ESCALATION",
            severity="WARNING",
            link_url=f"/investigations/{inv.id}",
            is_read=False
        )
        db.add(notif)
        db.commit()

        # 4. Create audit log entry
        log_audit(db, current_user.email, "CLAIM_ESCALATED", "CLAIM", claim_id, {
            "claim_id": claim_id,
            "investigation_id": inv.id,
            "case_number": inv.case_number,
            "role": current_user.role,
            "user": current_user.email,
            "note": payload.note
        })
    elif action == "ASSIGN":
        if payload.assigned_analyst:
            claim.assigned_analyst = payload.assigned_analyst
            claim.claim_status = "UNDER_REVIEW"
        log_audit(db, current_user.email, "CLAIM_MOVED_TO_UNDER_REVIEW", "CLAIM", claim_id, {
            "assigned_analyst": claim.assigned_analyst,
            "role": current_user.role,
            "user": current_user.email
        })
    else:
        claim.claim_status = action
        log_audit(db, current_user.email, "STATUS_CHANGED", "CLAIM", claim_id, {
            "action": action,
            "old_status": old_status,
            "new_status": claim.claim_status,
            "note": payload.note
        })

    db.commit()

    return {
        "message": f"Review action '{action}' processed successfully.",
        "claim_id": claim_id,
        "new_status": claim.claim_status,
        "assigned_analyst": claim.assigned_analyst,
        "investigation_id": inv_id
    }
