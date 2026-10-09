from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import ServiceEvent

# Synthetic standard mappings for diagnoses to expected level
UPCODING_SUSPECT_CODES = {
    "PROC_CONSULT_LVL5": {"expected": "PROC_CONSULT_LVL2", "max_expected": 2500, "actual_name": "Routine Consultation", "claimed_name": "Complex Multi-organ Consultation"},
    "PROC_SURG_MAJOR_03": {"expected": "PROC_SURG_MINOR_01", "max_expected": 25000, "actual_name": "Minor Excisional Procedure", "claimed_name": "Extensive Reconstructive Surgery"},
    "PROC_ICU_LEVEL4": {"expected": "PROC_GEN_WARD", "max_expected": 6000, "actual_name": "General Ward Monitoring", "claimed_name": "Level-4 Critical Intensive Care"},
    "PROC_DIAG_MRI_CONTRAST": {"expected": "PROC_DIAG_XRAY", "max_expected": 3000, "actual_name": "Standard Radiograph", "claimed_name": "Advanced Dual-Phase Contrast MRI"}
}

class UpcodingRule(BaseRule):
    rule_code = "UPCODING"
    rule_name = "Upcoding Detection"
    default_severity = "HIGH"
    default_weight = 38.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check if the procedure code is a known upcoded pattern
        if claim.procedure_code in UPCODING_SUSPECT_CODES:
            meta = UPCODING_SUSPECT_CODES[claim.procedure_code]
            if claim.claimed_amount > meta["max_expected"]:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Claimed service '{meta['claimed_name']}' represents an inflated billing level compared to expected clinical tier '{meta['actual_name']}'.",
                    evidence={
                        "actual_service": meta["actual_name"],
                        "claimed_service": meta["claimed_name"],
                        "expected_procedure": meta["expected"],
                        "claimed_procedure": claim.procedure_code,
                        "expected_amount": claim.expected_amount,
                        "claimed_amount": claim.claimed_amount,
                        "ratio": round(claim.claimed_amount / max(claim.expected_amount, 1), 2)
                    }
                )

        # Cross-reference with synthetic service event if available
        event = db.query(ServiceEvent).filter(
            ServiceEvent.patient_id == claim.patient_id,
            ServiceEvent.event_date == claim.service_date
        ).first()

        if event and event.service_code != claim.procedure_code:
            # Service event logged lower tier than claim
            if claim.claimed_amount > claim.expected_amount * 1.4:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Encounter recorded baseline service {event.service_name} ({event.service_code}), but claim was submitted for higher-tier {claim.procedure_code}.",
                    evidence={
                        "encounter_service": event.service_name,
                        "encounter_code": event.service_code,
                        "claimed_procedure": claim.procedure_code,
                        "expected_amount": claim.expected_amount,
                        "claimed_amount": claim.claimed_amount
                    }
                )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="Service level and procedure coding appear consistent with clinical tier."
        )
