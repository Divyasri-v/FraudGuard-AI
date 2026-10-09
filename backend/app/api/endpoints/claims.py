import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user, log_audit, require_roles
from app.models.models import (
    User, Claim, Patient, Provider, ClaimService, ServiceEvent,
    SupportingDocument, FraudDetection, Notification, Investigation
)
from app.schemas.schemas import (
    ClaimCreate, ClaimUpdate, ClaimResponse, ClaimDetailResponse, PaginatedResponse
)
from app.fraud_engine.engine import fraud_rule_engine
from app.fraud_engine.scoring import risk_scoring_engine
from app.ml.anomaly_detector import anomaly_detector

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
def list_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    provider_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    query = db.query(Claim)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Claim.claim_id.ilike(s),
            Claim.patient_id.ilike(s),
            Claim.provider_id.ilike(s),
            Claim.procedure_code.ilike(s),
            Claim.diagnosis_code.ilike(s)
        ))

    if risk_level:
        query = query.filter(Claim.risk_level == risk_level.upper())
    if status:
        query = query.filter(Claim.claim_status == status.upper())
    if provider_id:
        query = query.filter(Claim.provider_id == provider_id)
    if patient_id:
        query = query.filter(Claim.patient_id == patient_id)
    if min_amount is not None:
        query = query.filter(Claim.claimed_amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Claim.claimed_amount <= max_amount)

    total = query.count()
    claims = query.order_by(desc(Claim.hybrid_score), desc(Claim.created_at))\
                  .offset((page - 1) * page_size)\
                  .limit(page_size)\
                  .all()

    total_pages = (total + page_size - 1) // page_size

    items = [
        {
            "claim_id": c.claim_id,
            "patient_id": c.patient_id,
            "provider_id": c.provider_id,
            "service_date": c.service_date,
            "submission_date": c.submission_date,
            "diagnosis_code": c.diagnosis_code,
            "procedure_code": c.procedure_code,
            "service_type": c.service_type,
            "claimed_amount": c.claimed_amount,
            "expected_amount": c.expected_amount,
            "quantity": c.quantity,
            "claim_status": c.claim_status,
            "supporting_document_status": c.supporting_document_status,
            "authorization_status": c.authorization_status,
            "risk_score": c.risk_score,
            "risk_level": c.risk_level,
            "ml_anomaly_score": c.ml_anomaly_score,
            "hybrid_score": c.hybrid_score,
            "assigned_analyst": c.assigned_analyst,
            "created_at": c.created_at
        }
        for c in claims
    ]

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.post("", response_model=ClaimDetailResponse)
def create_claim(
    payload: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    # Verify patient and provider exist
    patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=400, detail=f"Synthetic Patient ID {payload.patient_id} not found.")

    provider = db.query(Provider).filter(Provider.provider_id == payload.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail=f"Synthetic Provider ID {payload.provider_id} not found.")

    # Generate new unique claim ID
    last_claim = db.query(Claim).order_by(desc(Claim.claim_id)).first()
    next_num = 1
    if last_claim and last_claim.claim_id.startswith("CLM"):
        try:
            next_num = int(last_claim.claim_id.replace("CLM", "")) + 1
        except Exception:
            next_num = db.query(Claim).count() + 1
    new_claim_id = f"CLM{next_num:05d}"

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sub_date = payload.submission_date or today_str

    claim = Claim(
        claim_id=new_claim_id,
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        service_date=payload.service_date,
        submission_date=sub_date,
        diagnosis_code=payload.diagnosis_code,
        procedure_code=payload.procedure_code,
        service_type=payload.service_type,
        claimed_amount=payload.claimed_amount,
        expected_amount=payload.expected_amount,
        quantity=payload.quantity,
        claim_status="SUBMITTED",
        supporting_document_status=payload.supporting_document_status,
        authorization_status=payload.authorization_status,
        risk_score=0.0,
        risk_level="LOW",
        ml_anomaly_score=0.0,
        hybrid_score=0.0
    )
    db.add(claim)

    # Add line item
    item = ClaimService(
        claim_id=new_claim_id,
        service_code=payload.procedure_code,
        service_name=f"Synthetic {payload.service_type} Consultation",
        quantity=payload.quantity,
        unit_price=payload.claimed_amount,
        total_amount=payload.claimed_amount,
        category=payload.service_type
    )
    db.add(item)

    # Add supporting document
    doc = SupportingDocument(
        claim_id=new_claim_id,
        document_type="SYNTHETIC_INVOICE",
        file_name=f"synthetic_invoice_{new_claim_id}.pdf",
        file_url=f"/demo_docs/{new_claim_id}_invoice.pdf",
        is_verified=(payload.supporting_document_status == "COMPLETE"),
        notes="Synthetic test document created during submission."
    )
    db.add(doc)

    # Add encounter event record
    event = ServiceEvent(
        event_id=f"EVT{next_num:06d}",
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        event_date=payload.service_date,
        event_time="10:00",
        service_code=payload.procedure_code,
        service_name=f"Synthetic Clinical Service {payload.procedure_code}",
        location="Outpatient Pavilion",
        status="COMPLETED"
    )
    db.add(event)
    db.commit()

    # Run complete 10-rule analysis
    rule_results = fraud_rule_engine.run_all_rules(claim, db)
    fraud_rule_engine.save_detections(claim, rule_results, db)
    rule_score = risk_scoring_engine.calculate_rule_score(rule_results)

    # Run ML Anomaly Detection
    features = anomaly_detector.extract_features_single(claim, provider)
    ml_score, is_anomaly = anomaly_detector.predict_anomaly_score(features)

    # Compute Hybrid Risk Score
    hybrid_score = risk_scoring_engine.calculate_hybrid_score(rule_score, ml_score)
    risk_level = risk_scoring_engine.get_risk_level(hybrid_score)

    claim.risk_score = rule_score
    claim.ml_anomaly_score = ml_score
    claim.hybrid_score = hybrid_score
    claim.risk_level = risk_level
    claim.why_flagged = risk_scoring_engine.generate_explanations(
        rule_results, ml_score, provider.historical_suspicious_rate
    )

    # Workflow triage
    if risk_level == "LOW":
        claim.claim_status = "APPROVED"
    elif risk_level in ["MEDIUM", "HIGH", "CRITICAL"]:
        claim.claim_status = "UNDER_REVIEW"

    # Notification & auto-investigation if critical
    if hybrid_score >= 81.0:
        notif = Notification(
            user_role="Fraud Analyst",
            title=f"🚨 Critical Claim Submitted: {claim.claim_id}",
            message=f"New claim {claim.claim_id} flagged with Critical Risk score {hybrid_score:.1f}. Rules: {', '.join([r.rule_code for r in rule_results if r.triggered])}",
            notification_type="CRITICAL_ALERT",
            severity="CRITICAL",
            link_url=f"/claims/{claim.claim_id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(claim)

    log_audit(db, current_user.email, "CLAIM_CREATED", "CLAIM", claim.claim_id, {
        "claimed_amount": claim.claimed_amount,
        "hybrid_score": claim.hybrid_score,
        "risk_level": claim.risk_level
    })

    return get_claim_details(claim.claim_id, db, current_user)

@router.get("/{claim_id}", response_model=ClaimDetailResponse)
def get_claim_details(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.api.deps import normalize_role
    role_norm = normalize_role(current_user.role)
    if role_norm not in ["FRAUD_ANALYST", "INVESTIGATOR"]:
        raise HTTPException(status_code=403, detail="Access forbidden: unauthorized role.")

    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if role_norm == "INVESTIGATOR":
        # Investigator can inspect a claim ONLY through an associated Investigation
        inv = db.query(Investigation).filter(Investigation.claim_id == claim_id).first()
        if not inv:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: Investigator can inspect a claim ONLY through an active or associated Investigation."
            )

    patient = db.query(Patient).filter(Patient.patient_id == claim.patient_id).first()
    provider = db.query(Provider).filter(Provider.provider_id == claim.provider_id).first()
    services = db.query(ClaimService).filter(ClaimService.claim_id == claim_id).all()
    documents = db.query(SupportingDocument).filter(SupportingDocument.claim_id == claim_id).all()
    detections = db.query(FraudDetection).filter(FraudDetection.claim_id == claim_id).all()

    action_name = "CLAIM_INSPECTED" if role_norm == "INVESTIGATOR" else "CLAIM_REVIEWED"
    log_audit(db, current_user.email, action_name, "CLAIM", claim_id, {
        "role": current_user.role,
        "user": current_user.email
    })

    return ClaimDetailResponse(
        claim_id=claim.claim_id,
        patient_id=claim.patient_id,
        provider_id=claim.provider_id,
        service_date=claim.service_date,
        submission_date=claim.submission_date,
        diagnosis_code=claim.diagnosis_code,
        procedure_code=claim.procedure_code,
        service_type=claim.service_type,
        claimed_amount=claim.claimed_amount,
        expected_amount=claim.expected_amount,
        quantity=claim.quantity,
        claim_status=claim.claim_status,
        supporting_document_status=claim.supporting_document_status,
        authorization_status=claim.authorization_status,
        risk_score=claim.risk_score,
        risk_level=claim.risk_level,
        ml_anomaly_score=claim.ml_anomaly_score,
        hybrid_score=claim.hybrid_score,
        assigned_analyst=claim.assigned_analyst,
        why_flagged=claim.why_flagged,
        created_at=claim.created_at,
        patient=patient,
        provider=provider,
        services=[
            {
                "service_code": s.service_code,
                "service_name": s.service_name,
                "quantity": s.quantity,
                "unit_price": s.unit_price,
                "total_amount": s.total_amount,
                "category": s.category
            }
            for s in services
        ],
        documents=[
            {
                "id": d.id,
                "document_type": d.document_type,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "is_verified": d.is_verified,
                "notes": d.notes,
                "uploaded_at": d.uploaded_at
            }
            for d in documents
        ],
        detections=[
            {
                "rule_code": det.rule_code,
                "rule_name": det.rule_name,
                "triggered": det.triggered,
                "risk_contribution": det.risk_contribution,
                "severity": det.severity,
                "reason": det.reason,
                "evidence": det.evidence
            }
            for det in detections
        ]
    )

@router.put("/{claim_id}")
def update_claim(
    claim_id: str,
    payload: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    old_status = claim.claim_status
    if payload.claim_status:
        claim.claim_status = payload.claim_status.upper()
    if payload.assigned_analyst is not None:
        claim.assigned_analyst = payload.assigned_analyst

    db.commit()

    log_audit(db, current_user.email, "CLAIM_UPDATED", "CLAIM", claim_id, {
        "old_status": old_status,
        "new_status": claim.claim_status,
        "assigned_analyst": claim.assigned_analyst
    })

    return {"message": "Claim updated successfully", "claim_id": claim_id, "status": claim.claim_status}

@router.delete("/{claim_id}", dependencies=[Depends(require_roles(["FRAUD_ANALYST"]))])
def delete_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["FRAUD_ANALYST"]))
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    db.delete(claim)
    db.commit()
    log_audit(db, current_user.email, "CLAIM_DELETED", "CLAIM", claim_id)
    return {"message": "Claim deleted successfully", "claim_id": claim_id}
