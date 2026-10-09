from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, case

from app.api.deps import get_db, get_current_user
from app.models.models import Claim, FraudDetection, Provider, Investigation, User
from app.core.config import settings

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_claims = db.query(Claim).count()
    if total_claims == 0:
        return {
            "total_claims": 0,
            "claims_reviewed": 0,
            "suspicious_claims": 0,
            "critical_claims": 0,
            "under_investigation": 0,
            "potential_risk_amount": 0.0,
            "average_risk_score": 0.0,
            "suspicious_claim_percentage": 0.0,
            "disclaimer": settings.DATA_DISCLAIMER
        }

    claims_reviewed = db.query(Claim).filter(Claim.claim_status.in_(["APPROVED", "REJECTED", "CLOSED"])).count()
    suspicious_claims = db.query(Claim).filter(Claim.risk_level.in_(["MEDIUM", "HIGH", "CRITICAL"])).count()
    critical_claims = db.query(Claim).filter(Claim.risk_level == "CRITICAL").count()
    under_investigation = db.query(Claim).filter(Claim.claim_status.in_(["UNDER_REVIEW", "ESCALATED", "MORE_INFORMATION_REQUIRED"])).count()

    risk_amount_query = db.query(func.sum(Claim.claimed_amount))\
                          .filter(Claim.risk_level.in_(["HIGH", "CRITICAL"]))\
                          .scalar()
    potential_risk_amount = float(risk_amount_query or 0.0)

    avg_score_query = db.query(func.avg(Claim.hybrid_score)).scalar()
    average_risk_score = round(float(avg_score_query or 0.0), 1)

    suspicious_pct = round((suspicious_claims / total_claims) * 100, 1)

    return {
        "total_claims": total_claims,
        "claims_reviewed": claims_reviewed,
        "suspicious_claims": suspicious_claims,
        "critical_claims": critical_claims,
        "under_investigation": under_investigation,
        "potential_risk_amount": potential_risk_amount,
        "average_risk_score": average_risk_score,
        "suspicious_claim_percentage": suspicious_pct,
        "disclaimer": settings.DATA_DISCLAIMER
    }

@router.get("/trends")
def get_dashboard_trends(db: Session = Depends(get_db)):
    # Group claims by service_date (or month)
    claims = db.query(
        Claim.service_date,
        func.count(Claim.claim_id).label("total"),
        func.sum(case((Claim.risk_level.in_(["MEDIUM", "HIGH", "CRITICAL"]), 1), else_=0)).label("suspicious")
    ).group_by(Claim.service_date)\
     .order_by(Claim.service_date)\
     .limit(30)\
     .all()

    return [
        {
            "date": c.service_date,
            "total_claims": c.total,
            "suspicious_claims": int(c.suspicious or 0)
        }
        for c in claims
    ]

@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        Claim.risk_level,
        func.count(Claim.claim_id).label("count")
    ).group_by(Claim.risk_level).all()

    levels = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for d in dist:
        if d.risk_level in levels:
            levels[d.risk_level] = d.count

    return [
        {"level": k, "count": v, "color": "#10b981" if k == "LOW" else ("#eab308" if k == "MEDIUM" else ("#f97316" if k == "HIGH" else "#ef4444"))}
        for k, v in levels.items()
    ]

@router.get("/fraud-types")
def get_fraud_types_distribution(db: Session = Depends(get_db)):
    # Counts of triggered rules
    results = db.query(
        FraudDetection.rule_name,
        FraudDetection.rule_code,
        func.count(FraudDetection.id).label("count")
    ).filter(FraudDetection.triggered == True)\
     .group_by(FraudDetection.rule_name, FraudDetection.rule_code)\
     .order_by(desc("count"))\
     .all()

    return [
        {
            "rule_code": r.rule_code,
            "rule_name": r.rule_name.replace(" Detection", ""),
            "count": r.count
        }
        for r in results
    ]

@router.get("/top-providers")
def get_top_suspicious_providers(db: Session = Depends(get_db)):
    providers = db.query(
        Provider.provider_id,
        Provider.provider_name,
        Provider.provider_risk_score,
        Provider.historical_suspicious_rate,
        func.count(Claim.claim_id).label("total_claims"),
        func.sum(case((Claim.risk_level.in_(["HIGH", "CRITICAL"]), 1), else_=0)).label("critical_claims")
    ).outerjoin(Claim, Provider.provider_id == Claim.provider_id)\
     .group_by(Provider.provider_id, Provider.provider_name, Provider.provider_risk_score, Provider.historical_suspicious_rate)\
     .order_by(desc("critical_claims"), desc(Provider.provider_risk_score))\
     .limit(10)\
     .all()

    return [
        {
            "provider_id": p.provider_id,
            "provider_name": p.provider_name,
            "risk_score": p.provider_risk_score,
            "suspicious_rate": round(p.historical_suspicious_rate * 100, 1),
            "total_claims": p.total_claims or 0,
            "critical_claims": int(p.critical_claims or 0)
        }
        for p in providers
    ]

@router.get("/amount-vs-risk")
def get_amount_vs_risk(db: Session = Depends(get_db)):
    # Sample 100 points for scatter chart
    claims = db.query(
        Claim.claim_id,
        Claim.claimed_amount,
        Claim.hybrid_score,
        Claim.risk_level
    ).order_by(func.random()).limit(120).all()

    return [
        {
            "claim_id": c.claim_id,
            "amount": c.claimed_amount,
            "risk_score": c.hybrid_score,
            "risk_level": c.risk_level
        }
        for c in claims
    ]

@router.get("/financial-exposure")
def get_financial_exposure(db: Session = Depends(get_db)):
    # Calculate potential financial exposure grouped by rule
    detections = db.query(
        FraudDetection.rule_name,
        func.sum(Claim.claimed_amount).label("exposure"),
        func.count(Claim.claim_id).label("count")
    ).join(Claim, FraudDetection.claim_id == Claim.claim_id)\
     .filter(FraudDetection.triggered == True)\
     .group_by(FraudDetection.rule_name)\
     .order_by(desc("exposure"))\
     .all()

    return [
        {
            "rule": d.rule_name.replace(" Detection", ""),
            "exposure": round(float(d.exposure or 0.0), 2),
            "claim_count": d.count
        }
        for d in detections
    ]
