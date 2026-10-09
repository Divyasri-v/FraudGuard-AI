from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.api.deps import get_db, get_current_user
from app.models.models import Provider, Claim, FraudDetection, Investigation, User
from app.schemas.schemas import PaginatedResponse

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
def list_providers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    city: Optional[str] = None,
    specialization: Optional[str] = None,
    min_risk: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Provider)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            Provider.provider_id.ilike(s),
            Provider.provider_name.ilike(s),
            Provider.city.ilike(s),
            Provider.specialization.ilike(s)
        ))

    if city:
        query = query.filter(Provider.city == city)
    if specialization:
        query = query.filter(Provider.specialization == specialization)
    if min_risk is not None:
        query = query.filter(Provider.provider_risk_score >= min_risk)

    total = query.count()
    providers = query.order_by(desc(Provider.provider_risk_score))\
                     .offset((page - 1) * page_size)\
                     .limit(page_size)\
                     .all()

    total_pages = (total + page_size - 1) // page_size

    items = [
        {
            "provider_id": p.provider_id,
            "provider_name": p.provider_name,
            "provider_type": p.provider_type,
            "city": p.city,
            "specialization": p.specialization,
            "network_status": p.network_status,
            "historical_claim_count": p.historical_claim_count,
            "historical_suspicious_rate": p.historical_suspicious_rate,
            "provider_risk_score": p.provider_risk_score
        }
        for p in providers
    ]

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{provider_id}")
def get_provider_details(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    provider = db.query(Provider).filter(Provider.provider_id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Aggregate provider claims metrics
    claims = db.query(Claim).filter(Claim.provider_id == provider_id).all()
    total_claims = len(claims)
    suspicious_claims = len([c for c in claims if c.risk_level in ["MEDIUM", "HIGH", "CRITICAL"]])
    critical_claims = len([c for c in claims if c.risk_level == "CRITICAL"])
    total_amount = sum(c.claimed_amount for c in claims)
    avg_amount = round(total_amount / max(total_claims, 1), 2)
    avg_risk = round(sum(c.hybrid_score for c in claims) / max(total_claims, 1), 1)

    # Investigation count
    claim_ids = [c.claim_id for c in claims]
    inv_count = db.query(Investigation).filter(Investigation.claim_id.in_(claim_ids)).count()

    # Fraud types distribution for this provider
    fraud_breakdown = db.query(
        FraudDetection.rule_name,
        func.count(FraudDetection.id).label("count")
    ).filter(
        FraudDetection.claim_id.in_(claim_ids),
        FraudDetection.triggered == True
    ).group_by(FraudDetection.rule_name).all()

    # Recent claims
    recent_claims = [
        {
            "claim_id": c.claim_id,
            "patient_id": c.patient_id,
            "service_date": c.service_date,
            "procedure_code": c.procedure_code,
            "claimed_amount": c.claimed_amount,
            "expected_amount": c.expected_amount,
            "risk_score": c.risk_score,
            "hybrid_score": c.hybrid_score,
            "risk_level": c.risk_level,
            "claim_status": c.claim_status
        }
        for c in claims[:15]
    ]

    return {
        "provider": {
            "provider_id": provider.provider_id,
            "provider_name": provider.provider_name,
            "provider_type": provider.provider_type,
            "city": provider.city,
            "specialization": provider.specialization,
            "network_status": provider.network_status,
            "provider_risk_score": provider.provider_risk_score,
            "historical_suspicious_rate": round(provider.historical_suspicious_rate * 100, 1)
        },
        "stats": {
            "total_claims": total_claims,
            "suspicious_claims": suspicious_claims,
            "critical_claims": critical_claims,
            "suspicious_rate": round((suspicious_claims / max(total_claims, 1)) * 100, 1),
            "average_claim_amount": avg_amount,
            "average_risk_score": avg_risk,
            "investigation_count": inv_count
        },
        "fraud_breakdown": [{"rule": f.rule_name.replace(" Detection", ""), "count": f.count} for f in fraud_breakdown],
        "recent_claims": recent_claims
    }
