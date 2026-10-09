import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user, log_audit, require_roles
from app.models.models import (
    Investigation, InvestigationNote, Evidence, Claim, Patient, Provider,
    FraudDetection, Notification, User
)
from app.schemas.schemas import (
    InvestigationCreate, InvestigationUpdate, InvestigationNoteCreate,
    EvidenceCreate, PaginatedResponse
)

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
def list_investigations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    query = db.query(Investigation)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Investigation.case_number.ilike(s),
            Investigation.claim_id.ilike(s),
            Investigation.summary.ilike(s)
        ))

    if status:
        query = query.filter(Investigation.status == status.upper())
    if priority:
        query = query.filter(Investigation.priority == priority.upper())
    if assigned_to:
        query = query.filter(Investigation.assigned_to.ilike(f"%{assigned_to}%"))

    total = query.count()
    cases = query.order_by(desc(Investigation.created_at))\
                 .offset((page - 1) * page_size)\
                 .limit(page_size)\
                 .all()

    total_pages = (total + page_size - 1) // page_size

    # Join claim risk details
    claim_ids = [c.claim_id for c in cases]
    claims = {c.claim_id: c for c in db.query(Claim).filter(Claim.claim_id.in_(claim_ids)).all()}

    items = []
    for c in cases:
        claim_obj = claims.get(c.claim_id)
        items.append({
            "id": c.id,
            "case_number": c.case_number,
            "claim_id": c.claim_id,
            "status": c.status,
            "priority": c.priority,
            "assigned_to": c.assigned_to,
            "investigator": c.investigator,
            "summary": c.summary,
            "findings": c.findings,
            "recommendation": c.recommendation,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "closed_at": c.closed_at,
            "risk_score": claim_obj.risk_score if claim_obj else 0.0,
            "hybrid_score": claim_obj.hybrid_score if claim_obj else 0.0,
            "risk_level": claim_obj.risk_level if claim_obj else "LOW",
            "claimed_amount": claim_obj.claimed_amount if claim_obj else 0.0,
            "patient_id": claim_obj.patient_id if claim_obj else "",
            "provider_id": claim_obj.provider_id if claim_obj else ""
        })

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.post("")
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    claim = db.query(Claim).filter(Claim.claim_id == payload.claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    count = db.query(Investigation).count() + 1
    case_no = f"INV-2026-{count:04d}"

    inv = Investigation(
        claim_id=payload.claim_id,
        case_number=case_no,
        status="NEW",
        priority=payload.priority.upper(),
        assigned_to=payload.assigned_to or current_user.full_name,
        investigator=payload.investigator or "Elena Rostova (investigator@fraudguard.demo)",
        summary=payload.summary or f"Manual investigation initiated for claim {payload.claim_id}."
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Initial note
    note = InvestigationNote(
        investigation_id=inv.id,
        author_email=current_user.email,
        author_role=current_user.role,
        note_type="OBSERVATION",
        content=f"Case {case_no} created manually."
    )
    db.add(note)
    db.commit()

    log_audit(db, current_user.email, "INVESTIGATION_CREATED", "INVESTIGATION", str(inv.id), {
        "case_number": case_no,
        "claim_id": payload.claim_id
    })

    return {"message": "Investigation created successfully", "case_number": case_no, "id": inv.id}

@router.get("/{id}")
def get_investigation_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    inv = db.query(Investigation).filter(Investigation.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    log_audit(db, current_user.email, "INVESTIGATION_OPENED", "INVESTIGATION", str(id), {
        "case_number": inv.case_number,
        "claim_id": inv.claim_id,
        "role": current_user.role,
        "user": current_user.email
    })

    claim = db.query(Claim).filter(Claim.claim_id == inv.claim_id).first()
    patient = db.query(Patient).filter(Patient.patient_id == claim.patient_id).first() if claim else None
    provider = db.query(Provider).filter(Provider.provider_id == claim.provider_id).first() if claim else None
    detections = db.query(FraudDetection).filter(FraudDetection.claim_id == inv.claim_id).all() if claim else []
    notes = db.query(InvestigationNote).filter(InvestigationNote.investigation_id == id).order_by(desc(InvestigationNote.created_at)).all()
    evidences = db.query(Evidence).filter(Evidence.investigation_id == id).order_by(desc(Evidence.created_at)).all()

    # Related claims for this patient
    related_claims = []
    if claim:
        rel = db.query(Claim).filter(
            Claim.patient_id == claim.patient_id,
            Claim.claim_id != claim.claim_id
        ).order_by(desc(Claim.created_at)).limit(5).all()
        related_claims = [
            {
                "claim_id": r.claim_id,
                "service_date": r.service_date,
                "procedure_code": r.procedure_code,
                "claimed_amount": r.claimed_amount,
                "risk_score": r.risk_score,
                "hybrid_score": r.hybrid_score,
                "risk_level": r.risk_level,
                "claim_status": r.claim_status
            }
            for r in rel
        ]

    return {
        "id": inv.id,
        "case_number": inv.case_number,
        "claim_id": inv.claim_id,
        "status": inv.status,
        "priority": inv.priority,
        "assigned_to": inv.assigned_to,
        "investigator": inv.investigator,
        "summary": inv.summary,
        "findings": inv.findings,
        "recommendation": inv.recommendation,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at,
        "closed_at": inv.closed_at,
        "claim": {
            "claim_id": claim.claim_id,
            "patient_id": claim.patient_id,
            "provider_id": claim.provider_id,
            "service_date": claim.service_date,
            "claimed_amount": claim.claimed_amount,
            "expected_amount": claim.expected_amount,
            "procedure_code": claim.procedure_code,
            "diagnosis_code": claim.diagnosis_code,
            "service_type": claim.service_type,
            "claim_status": claim.claim_status,
            "risk_score": claim.risk_score,
            "ml_anomaly_score": claim.ml_anomaly_score,
            "hybrid_score": claim.hybrid_score,
            "risk_level": claim.risk_level,
            "why_flagged": claim.why_flagged
        } if claim else None,
        "patient": {
            "patient_id": patient.patient_id,
            "name": patient.synthetic_name,
            "age": patient.age,
            "gender": patient.gender,
            "city": patient.city,
            "plan": patient.insurance_plan
        } if patient else None,
        "provider": {
            "provider_id": provider.provider_id,
            "name": provider.provider_name,
            "type": provider.provider_type,
            "city": provider.city,
            "suspicious_rate": provider.historical_suspicious_rate,
            "risk_score": provider.provider_risk_score
        } if provider else None,
        "detections": [
            {
                "rule_code": d.rule_code,
                "rule_name": d.rule_name,
                "triggered": d.triggered,
                "risk_contribution": d.risk_contribution,
                "severity": d.severity,
                "reason": d.reason,
                "evidence": d.evidence
            }
            for d in detections
        ],
        "notes": [
            {
                "id": n.id,
                "author_email": n.author_email,
                "author_role": n.author_role,
                "note_type": n.note_type,
                "content": n.content,
                "created_at": n.created_at
            }
            for n in notes
        ],
        "evidences": [
            {
                "id": e.id,
                "evidence_type": e.evidence_type,
                "description": e.description,
                "file_path": e.file_path,
                "source": e.source,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at
            }
            for e in evidences
        ],
        "related_claims": related_claims
    }

@router.put("/{id}")
def update_investigation(
    id: int,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    inv = db.query(Investigation).filter(Investigation.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    if payload.status:
        st = payload.status.upper()
        if st in ["CLOSED_NO_CONCERN", "APPROVED", "APPROVE", "CLEAR"]:
            inv.status = "CLOSED_NO_CONCERN"
            inv.closed_at = datetime.now(timezone.utc)
            # Create notification for Fraud Analyst
            notif = Notification(
                user_role="Fraud Analyst",
                title=f"Investigation Completed: {inv.claim_id}",
                message=f"Investigation for Claim {inv.claim_id} has been completed.",
                notification_type="INVESTIGATION_COMPLETED",
                severity="INFO",
                link_url=f"/claims/{inv.claim_id}",
                is_read=False
            )
            db.add(notif)
            log_audit(db, current_user.email, "CLAIM_APPROVED_CLEARED", "INVESTIGATION", str(inv.id), {
                "claim_id": inv.claim_id,
                "investigation_id": inv.id,
                "case_number": inv.case_number,
                "status": "CLOSED_NO_CONCERN",
                "role": current_user.role,
                "user": current_user.email,
                "recommendation": payload.recommendation
            })
        elif st in ["CLOSED_FINDINGS", "REJECTED", "REJECT"]:
            inv.status = "CLOSED_FINDINGS"
            inv.closed_at = datetime.now(timezone.utc)
            # Create notification for Fraud Analyst
            notif = Notification(
                user_role="Fraud Analyst",
                title=f"Investigation Completed: {inv.claim_id}",
                message=f"Investigation for Claim {inv.claim_id} has been completed.",
                notification_type="INVESTIGATION_COMPLETED",
                severity="WARNING",
                link_url=f"/claims/{inv.claim_id}",
                is_read=False
            )
            db.add(notif)
            log_audit(db, current_user.email, "CLAIM_REJECTED_CLOSED_FINDINGS", "INVESTIGATION", str(inv.id), {
                "claim_id": inv.claim_id,
                "investigation_id": inv.id,
                "case_number": inv.case_number,
                "status": "CLOSED_FINDINGS",
                "role": current_user.role,
                "user": current_user.email,
                "recommendation": payload.recommendation
            })
        elif st == "IN_PROGRESS":
            inv.status = "IN_PROGRESS"
            log_audit(db, current_user.email, "INVESTIGATION_STARTED", "INVESTIGATION", str(inv.id), {
                "claim_id": inv.claim_id,
                "investigation_id": inv.id,
                "case_number": inv.case_number,
                "status": "IN_PROGRESS",
                "role": current_user.role,
                "user": current_user.email
            })
        else:
            inv.status = st
            log_audit(db, current_user.email, "STATUS_CHANGED", "INVESTIGATION", str(inv.id), {
                "claim_id": inv.claim_id,
                "status": inv.status,
                "recommendation": payload.recommendation,
                "role": current_user.role,
                "user": current_user.email
            })

    if payload.priority:
        inv.priority = payload.priority.upper()
    if payload.assigned_to is not None:
        inv.assigned_to = payload.assigned_to
    if payload.investigator is not None:
        inv.investigator = payload.investigator
    if payload.summary is not None:
        inv.summary = payload.summary
    if payload.findings is not None:
        inv.findings = payload.findings
    if payload.recommendation is not None:
        inv.recommendation = payload.recommendation

    db.commit()

    return {"message": "Investigation updated successfully", "status": inv.status}

@router.post("/{id}/notes")
def add_investigation_note(
    id: int,
    payload: InvestigationNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    inv = db.query(Investigation).filter(Investigation.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    note = InvestigationNote(
        investigation_id=id,
        author_email=current_user.email,
        author_role=current_user.role,
        note_type=payload.note_type.upper(),
        content=payload.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit(db, current_user.email, "NOTE_ADDED", "INVESTIGATION", str(id), {
        "note_id": note.id,
        "claim_id": inv.claim_id,
        "investigation_id": id,
        "role": current_user.role,
        "user": current_user.email
    })

    return {"message": "Note added successfully", "note_id": note.id}

@router.post("/{id}/evidence")
def add_investigation_evidence(
    id: int,
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["INVESTIGATOR"]))
):
    inv = db.query(Investigation).filter(Investigation.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    ev = Evidence(
        investigation_id=id,
        evidence_type=payload.evidence_type.upper(),
        description=payload.description,
        file_path=payload.file_path or f"/demo_docs/evidence_{inv.case_number}_{len(inv.evidences)+1}.pdf",
        source=payload.source or "Synthetic Electronic Ledger",
        metadata_json=payload.metadata_json
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    log_audit(db, current_user.email, "EVIDENCE_ADDED", "INVESTIGATION", str(id), {
        "evidence_id": ev.id,
        "claim_id": inv.claim_id,
        "type": ev.evidence_type,
        "role": current_user.role,
        "user": current_user.email
    })

    return {"message": "Synthetic evidence registered successfully", "evidence_id": ev.id}
