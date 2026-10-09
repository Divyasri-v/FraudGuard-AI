import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from app.api.deps import get_db, get_current_user, log_audit
from app.models.models import Claim, FraudDetection, Provider, Investigation, FraudRule, User
from app.core.config import settings
from app.core.security import decode_access_token

router = APIRouter()
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

DISCLAIMER_TEXT = "SYNTHETIC DEMO DATA – FOR EDUCATIONAL/PROTOTYPE USE ONLY – NOT REAL PATIENT DATA"

@router.get("/fraud-summary")
def get_fraud_summary_report(db: Session = Depends(get_db)):
    total = db.query(Claim).count()
    suspicious = db.query(Claim).filter(Claim.risk_level.in_(["MEDIUM", "HIGH", "CRITICAL"])).count()
    critical = db.query(Claim).filter(Claim.risk_level == "CRITICAL").count()
    approved = db.query(Claim).filter(Claim.claim_status == "APPROVED").count()
    rejected = db.query(Claim).filter(Claim.claim_status == "REJECTED").count()
    in_review = db.query(Claim).filter(Claim.claim_status.in_(["UNDER_REVIEW", "ESCALATED"])).count()

    total_amount = db.query(func.sum(Claim.claimed_amount)).scalar() or 0.0
    risk_amount = db.query(func.sum(Claim.claimed_amount)).filter(Claim.risk_level.in_(["HIGH", "CRITICAL"])).scalar() or 0.0

    return {
        "title": "Comprehensive Fraud Detection Summary",
        "disclaimer": DISCLAIMER_TEXT,
        "metrics": {
            "total_claims": total,
            "suspicious_claims": suspicious,
            "critical_claims": critical,
            "approved_claims": approved,
            "rejected_claims": rejected,
            "in_review_claims": in_review,
            "total_claimed_amount": round(float(total_amount), 2),
            "potential_risk_exposure": round(float(risk_amount), 2),
            "suspicious_rate_pct": round((suspicious / max(total, 1)) * 100, 1)
        }
    }

@router.get("/provider-risk")
def get_provider_risk_report(db: Session = Depends(get_db)):
    providers = db.query(
        Provider.provider_id,
        Provider.provider_name,
        Provider.city,
        Provider.specialization,
        Provider.provider_risk_score,
        Provider.historical_suspicious_rate,
        func.count(Claim.claim_id).label("claims_count"),
        func.sum(case((Claim.risk_level.in_(["HIGH", "CRITICAL"]), 1), else_=0)).label("critical_count")
    ).outerjoin(Claim, Provider.provider_id == Claim.provider_id)\
     .group_by(Provider.provider_id, Provider.provider_name, Provider.city, Provider.specialization, Provider.provider_risk_score, Provider.historical_suspicious_rate)\
     .order_by(desc(Provider.provider_risk_score))\
     .limit(20)\
     .all()

    return {
        "title": "Healthcare Provider Risk & Anomaly Report",
        "disclaimer": DISCLAIMER_TEXT,
        "data": [
            {
                "provider_id": p.provider_id,
                "provider_name": p.provider_name,
                "city": p.city,
                "specialization": p.specialization,
                "risk_score": p.provider_risk_score,
                "suspicious_rate": round(p.historical_suspicious_rate * 100, 1),
                "total_claims": p.claims_count or 0,
                "critical_claims": int(p.critical_count or 0)
            }
            for p in providers
        ]
    }

@router.get("/financial-exposure")
def get_financial_exposure_report(db: Session = Depends(get_db)):
    breakdown = db.query(
        FraudDetection.rule_name,
        func.count(FraudDetection.id).label("detection_count"),
        func.sum(Claim.claimed_amount).label("total_exposure"),
        func.avg(Claim.claimed_amount).label("avg_amount")
    ).join(Claim, FraudDetection.claim_id == Claim.claim_id)\
     .filter(FraudDetection.triggered == True)\
     .group_by(FraudDetection.rule_name)\
     .order_by(desc("total_exposure"))\
     .all()

    return {
        "title": "Financial Exposure by Detected Fraud Mechanism",
        "disclaimer": DISCLAIMER_TEXT,
        "data": [
            {
                "fraud_mechanism": b.rule_name.replace(" Detection", ""),
                "detection_count": b.detection_count,
                "total_exposure": round(float(b.total_exposure or 0.0), 2),
                "avg_claim_amount": round(float(b.avg_amount or 0.0), 2)
            }
            for b in breakdown
        ]
    }

@router.get("/rule-performance")
def get_rule_performance_report(db: Session = Depends(get_db)):
    rules = db.query(FraudRule).all()
    detections = db.query(
        FraudDetection.rule_code,
        func.count(FraudDetection.id).label("trigger_count"),
        func.avg(FraudDetection.risk_contribution).label("avg_contribution")
    ).filter(FraudDetection.triggered == True)\
     .group_by(FraudDetection.rule_code)\
     .all()

    det_map = {d.rule_code: d for d in detections}

    return {
        "title": "Fraud Rule Engine Calibration & Performance",
        "disclaimer": DISCLAIMER_TEXT,
        "data": [
            {
                "rule_code": r.rule_code,
                "rule_name": r.rule_name,
                "severity": r.severity,
                "default_weight": r.default_weight,
                "threshold": r.threshold,
                "is_enabled": r.is_enabled,
                "times_triggered": det_map.get(r.rule_code).trigger_count if r.rule_code in det_map else 0,
                "avg_risk_contribution": round(float(det_map.get(r.rule_code).avg_contribution or 0.0), 1) if r.rule_code in det_map else 0.0
            }
            for r in rules
        ]
    }

@router.get("/export/csv")
def export_report_csv(
    report_type: str = Query("claims", pattern="^(claims|providers|investigations|rules)$"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_header: Optional[str] = Depends(optional_oauth2)
):
    user_email = "system@fraudguard.demo"
    active_token = auth_header or token
    if active_token:
        payload = decode_access_token(active_token)
        if payload and "sub" in payload:
            found_user = db.query(User).filter(User.email == payload["sub"]).first()
            if found_user:
                user_email = found_user.email
        else:
            first_user = db.query(User).first()
            if first_user:
                user_email = first_user.email
    else:
        first_user = db.query(User).first()
        if first_user:
            user_email = first_user.email

    output = io.StringIO()
    writer = csv.writer(output)

    # Required disclaimer header
    writer.writerow(["# NOTE: " + DISCLAIMER_TEXT])
    writer.writerow([])

    if report_type == "claims":
        writer.writerow(["Claim ID", "Patient ID", "Provider ID", "Service Date", "Claimed Amount", "Expected Amount", "Risk Score", "Risk Level", "Status"])
        claims = db.query(Claim).limit(1000).all()
        for c in claims:
            writer.writerow([c.claim_id, c.patient_id, c.provider_id, c.service_date, c.claimed_amount, c.expected_amount, c.hybrid_score, c.risk_level, c.claim_status])

    elif report_type == "providers":
        writer.writerow(["Provider ID", "Provider Name", "City", "Specialization", "Risk Score", "Historical Suspicious Rate"])
        provs = db.query(Provider).all()
        for p in provs:
            writer.writerow([p.provider_id, p.provider_name, p.city, p.specialization, p.provider_risk_score, p.historical_suspicious_rate])

    elif report_type == "investigations":
        writer.writerow(["Case Number", "Claim ID", "Status", "Priority", "Assigned To", "Investigator", "Summary"])
        invs = db.query(Investigation).all()
        for i in invs:
            writer.writerow([i.case_number, i.claim_id, i.status, i.priority, i.assigned_to, i.investigator, i.summary])

    elif report_type == "rules":
        writer.writerow(["Rule Code", "Rule Name", "Severity", "Weight", "Threshold", "Enabled"])
        rules = db.query(FraudRule).all()
        for r in rules:
            writer.writerow([r.rule_code, r.rule_name, r.severity, r.default_weight, r.threshold, r.is_enabled])

    log_audit(db, user_email, "REPORT_GENERATED", "REPORT", report_type)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fraudguard_{report_type}_report.csv"}
    )
