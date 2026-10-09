import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.fraud_engine.rules import ALL_RULES, RuleResult
from app.models.models import FraudRule, FraudDetection, Claim

DEFAULT_RULES_SEED = [
    {
        "rule_code": "DUPLICATE_BILLING",
        "rule_name": "Duplicate Billing Detection",
        "description": "Detects identical or near-identical claims submitted for the same patient, provider, and date.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "UPCODING",
        "rule_name": "Upcoding Detection",
        "description": "Identifies claims where the billing code represents a higher intensity tier than the clinical encounter justified.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.4,
        "is_enabled": True
    },
    {
        "rule_code": "UNBUNDLING",
        "rule_name": "Unbundling Detection",
        "description": "Detects fragmented component claims that should be bundled under a single comprehensive code.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "PHANTOM_BILLING",
        "rule_name": "Phantom Billing Detection",
        "description": "Identifies claims submitted for services with no recorded synthetic clinical encounter.",
        "severity": "CRITICAL",
        "default_weight": 45.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "FALSE_CLAIM",
        "rule_name": "False Claim Detection",
        "description": "Identifies discrepancies between claim details and registered clinical encounter logs.",
        "severity": "CRITICAL",
        "default_weight": 45.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "INFLATED_BILLING",
        "rule_name": "Inflated Billing Detection",
        "description": "Compares claimed amount to expected clinical benchmark and flags excessive ratios.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.5,
        "is_enabled": True
    },
    {
        "rule_code": "INCORRECT_BILLING",
        "rule_name": "Incorrect Billing Detection",
        "description": "Detects demographic, procedural, or clinical justification mismatches.",
        "severity": "HIGH",
        "default_weight": 36.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "UNSUPPORTED_SERVICES",
        "rule_name": "Unsupported Services Detection",
        "description": "Flags claims with missing documentation, incomplete records, or absent pre-authorizations.",
        "severity": "MEDIUM",
        "default_weight": 36.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "IMPOSSIBLE_TIMING",
        "rule_name": "Impossible Timing Detection",
        "description": "Detects geographically impossible travel intervals or overlapping surgical procedures.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.0,
        "is_enabled": True
    },
    {
        "rule_code": "MUTUALLY_EXCLUSIVE",
        "rule_name": "Mutually Exclusive Services Detection",
        "description": "Identifies procedure combinations that are clinically incompatible or contradictory.",
        "severity": "HIGH",
        "default_weight": 38.0,
        "threshold": 1.0,
        "is_enabled": True
    }
]

class FraudRuleEngine:
    def __init__(self):
        self.rules = {rule.rule_code: rule for rule in ALL_RULES}

    def ensure_default_rules(self, db: Session):
        """Seed default fraud rule configurations in the database if missing."""
        for rule_meta in DEFAULT_RULES_SEED:
            existing = db.query(FraudRule).filter(FraudRule.rule_code == rule_meta["rule_code"]).first()
            if not existing:
                db_rule = FraudRule(**rule_meta)
                db.add(db_rule)
            else:
                existing.default_weight = rule_meta["default_weight"]
                existing.severity = rule_meta["severity"]
        db.commit()

    def run_all_rules(self, claim: Claim, db: Session, rule_configs: Optional[Dict[str, Any]] = None) -> List[RuleResult]:
        """Execute all active fraud detection rules against a claim."""
        db_rules = rule_configs if rule_configs is not None else {r.rule_code: r for r in db.query(FraudRule).all()}
        results: List[RuleResult] = []

        for rule_code, rule_instance in self.rules.items():
            rule_config = db_rules.get(rule_code)
            if rule_config and not rule_config.is_enabled:
                continue

            try:
                res = rule_instance.evaluate(claim, db, rule_config)
                results.append(res)
            except Exception as e:
                # Catch gracefully without aborting entire analysis
                results.append(
                    RuleResult(
                        rule_code=rule_code,
                        rule_name=rule_instance.rule_name,
                        triggered=False,
                        risk_contribution=0.0,
                        severity="LOW",
                        reason=f"Rule evaluation skipped due to processing note: {str(e)}"
                    )
                )

        return results

    def save_detections(self, claim: Claim, results: List[RuleResult], db: Session):
        """Save detection results into the database."""
        # Remove previous detections for this claim
        db.query(FraudDetection).filter(FraudDetection.claim_id == claim.claim_id).delete()

        for res in results:
            det = FraudDetection(
                claim_id=claim.claim_id,
                rule_code=res.rule_code,
                rule_name=res.rule_name,
                triggered=res.triggered,
                risk_contribution=res.risk_contribution,
                severity=res.severity,
                reason=res.reason,
                evidence=json.dumps(res.evidence) if res.evidence else None
            )
            db.add(det)

        db.commit()

fraud_rule_engine = FraudRuleEngine()
