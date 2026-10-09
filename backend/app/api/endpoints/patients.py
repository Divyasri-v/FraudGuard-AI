from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user
from app.models.models import Patient, Claim, User
from app.schemas.schemas import PaginatedResponse

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    city: Optional[str] = None,
    insurance_plan: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Patient.patient_id.ilike(s),
            Patient.synthetic_name.ilike(s),
            Patient.city.ilike(s)
        ))

    if city:
        query = query.filter(Patient.city == city)
    if insurance_plan:
        query = query.filter(Patient.insurance_plan == insurance_plan)

    total = query.count()
    patients = query.order_by(Patient.patient_id)\
                    .offset((page - 1) * page_size)\
                    .limit(page_size)\
                    .all()

    total_pages = (total + page_size - 1) // page_size

    items = [
        {
            "patient_id": p.patient_id,
            "synthetic_name": p.synthetic_name,
            "age": p.age,
            "gender": p.gender,
            "city": p.city,
            "insurance_plan": p.insurance_plan,
            "registration_date": p.registration_date
        }
        for p in patients
    ]

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{patient_id}")
def get_patient_details(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Synthetic Patient not found")

    claims = db.query(Claim).filter(Claim.patient_id == patient_id).order_by(desc(Claim.service_date)).all()

    timeline = [
        {
            "claim_id": c.claim_id,
            "service_date": c.service_date,
            "provider_id": c.provider_id,
            "service_type": c.service_type,
            "procedure_code": c.procedure_code,
            "diagnosis_code": c.diagnosis_code,
            "claimed_amount": c.claimed_amount,
            "expected_amount": c.expected_amount,
            "risk_score": c.risk_score,
            "hybrid_score": c.hybrid_score,
            "risk_level": c.risk_level,
            "claim_status": c.claim_status,
            "why_flagged": c.why_flagged
        }
        for c in claims
    ]

    suspicious_claims = [t for t in timeline if t["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]]

    return {
        "patient": {
            "patient_id": patient.patient_id,
            "synthetic_name": patient.synthetic_name,
            "age": patient.age,
            "gender": patient.gender,
            "city": patient.city,
            "insurance_plan": patient.insurance_plan,
            "registration_date": patient.registration_date
        },
        "stats": {
            "total_claims": len(claims),
            "suspicious_claims_count": len(suspicious_claims),
            "total_claimed_amount": sum(c.claimed_amount for c in claims)
        },
        "timeline": timeline,
        "suspicious_claims": suspicious_claims
    }
