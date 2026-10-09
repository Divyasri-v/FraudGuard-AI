import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, log_audit, require_roles
from app.models.models import Claim, FraudRule, FraudDetection, Provider, User
from app.schemas.schemas import FraudRuleResponse, FraudRuleUpdate, FraudDetectionResponse
from app.fraud_engine.engine import fraud_rule_engine
from app.fraud_engine.scoring import risk_scoring_engine
from app.ml.anomaly_detector import anomaly_detector

router = APIRouter()

@router.get("/rules", response_model=List[FraudRuleResponse])
def get_all_rules(db: Session = Depends(get_db)):
    rules = db.query(FraudRule).all()
    return rules

@router.put("/rules/{rule_code}", dependencies=[Depends(require_roles(["FRAUD_ANALYST"]))])
def update_rule_config(
    rule_code: str,
    payload: FraudRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rule = db.query(FraudRule).filter(FraudRule.rule_code == rule_code.upper()).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Fraud rule not found.")

    if payload.severity is not None:
        rule.severity = payload.severity.upper()
    if payload.default_weight is not None:
        rule.default_weight = payload.default_weight
    if payload.threshold is not None:
        rule.threshold = payload.threshold
    if payload.is_enabled is not None:
        rule.is_enabled = payload.is_enabled

    db.commit()
    db.refresh(rule)

    log_audit(db, current_user.email, "RULE_CONFIG_CHANGED", "RULE", rule_code, {
        "severity": rule.severity,
        "weight": rule.default_weight,
        "threshold": rule.threshold,
        "enabled": rule.is_enabled
    })

    return {"message": f"Rule {rule_code} updated successfully", "rule": rule}

@router.post("/analyze/{claim_id}")
def analyze_claim(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    provider = db.query(Provider).filter(Provider.provider_id == claim.provider_id).first()

    # Run 10 rules
    rule_results = fraud_rule_engine.run_all_rules(claim, db)
    fraud_rule_engine.save_detections(claim, rule_results, db)
    rule_score = risk_scoring_engine.calculate_rule_score(rule_results)

    # Run ML
    feats = anomaly_detector.extract_features_single(claim, provider)
    ml_score, is_anomaly = anomaly_detector.predict_anomaly_score(feats)

    # Hybrid
    hybrid_score = risk_scoring_engine.calculate_hybrid_score(rule_score, ml_score)
    risk_lvl = risk_scoring_engine.get_risk_level(hybrid_score)

    claim.risk_score = rule_score
    claim.ml_anomaly_score = ml_score
    claim.hybrid_score = hybrid_score
    claim.risk_level = risk_lvl
    claim.why_flagged = risk_scoring_engine.generate_explanations(
        rule_results, ml_score, provider.historical_suspicious_rate if provider else 0.0
    )

    db.commit()

    log_audit(db, current_user.email, "RISK_CALCULATED", "CLAIM", claim_id, {
        "rule_score": rule_score,
        "ml_score": ml_score,
        "hybrid_score": hybrid_score,
        "risk_level": risk_lvl
    })

    return {
        "claim_id": claim.claim_id,
        "rule_score": rule_score,
        "ml_anomaly_score": ml_score,
        "hybrid_score": hybrid_score,
        "risk_level": risk_lvl,
        "why_flagged": claim.why_flagged,
        "detections": [
            {
                "rule_code": r.rule_code,
                "rule_name": r.rule_name,
                "triggered": r.triggered,
                "risk_contribution": r.risk_contribution,
                "severity": r.severity,
                "reason": r.reason,
                "evidence": r.evidence
            }
            for r in rule_results
        ]
    }

@router.get("/{claim_id}")
def get_claim_fraud_details(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    detections = db.query(FraudDetection).filter(FraudDetection.claim_id == claim_id).all()
    return {
        "claim_id": claim.claim_id,
        "risk_score": claim.risk_score,
        "ml_anomaly_score": claim.ml_anomaly_score,
        "hybrid_score": claim.hybrid_score,
        "risk_level": claim.risk_level,
        "why_flagged": claim.why_flagged,
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
        ]
    }
