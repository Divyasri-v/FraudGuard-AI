from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import Claim

# Synthetic table of mutually exclusive procedure pairs
MUTUALLY_EXCLUSIVE_PAIRS = [
    {
        "proc_a": "PROC_OPEN_APPENDECTOMY",
        "proc_b": "PROC_LAP_APPENDECTOMY",
        "reason": "Open Appendectomy and Laparoscopic Appendectomy cannot both be performed on the same patient encounter."
    },
    {
        "proc_a": "PROC_TOTAL_HYSTERECTOMY",
        "proc_b": "PROC_PARTIAL_HYSTERECTOMY",
        "reason": "Total and partial hysterectomy are mutually exclusive surgical procedures."
    },
    {
        "proc_a": "PROC_TONSILLECTOMY_TOTAL",
        "proc_b": "PROC_TONSILLECTOMY_LASER_PARTIAL",
        "reason": "Complete excisional tonsillectomy and partial laser ablation are mutually exclusive."
    },
    {
        "proc_a": "PROC_RIGHT_KNEE_TOTAL",
        "proc_b": "PROC_RIGHT_KNEE_UNI",
        "reason": "Total and unicompartmental knee arthroplasty on the same anatomical side cannot co-exist."
    },
    {
        "proc_a": "PROC_NORMAL_DELIVERY",
        "proc_b": "PROC_CESAREAN",
        "reason": "Normal vaginal delivery and Cesarean section cannot be concurrently billed for the same episode."
    }
]

class MutuallyExclusiveServicesRule(BaseRule):
    rule_code = "MUTUALLY_EXCLUSIVE"
    rule_name = "Mutually Exclusive Services Detection"
    default_severity = "HIGH"
    default_weight = 38.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Find conflicting pairs where current claim is proc_a or proc_b
        for pair in MUTUALLY_EXCLUSIVE_PAIRS:
            partner_code = None
            if claim.procedure_code == pair["proc_a"]:
                partner_code = pair["proc_b"]
            elif claim.procedure_code == pair["proc_b"]:
                partner_code = pair["proc_a"]

            if partner_code:
                # Check if another claim exists for this patient on the same date with partner_code
                conflicting_claim = db.query(Claim).filter(
                    Claim.claim_id != claim.claim_id,
                    Claim.patient_id == claim.patient_id,
                    Claim.service_date == claim.service_date,
                    Claim.procedure_code == partner_code
                ).first()

                if conflicting_claim:
                    return RuleResult(
                        rule_code=self.rule_code,
                        rule_name=self.rule_name,
                        triggered=True,
                        risk_contribution=weight,
                        severity=severity,
                        reason=f"Mutually exclusive procedure billing: {claim.procedure_code} is incompatible with concurrently billed {partner_code}. {pair['reason']}",
                        evidence={
                            "claimed_procedure": claim.procedure_code,
                            "incompatible_procedure": partner_code,
                            "conflicting_claim_id": conflicting_claim.claim_id,
                            "service_date": claim.service_date,
                            "rationale": pair["reason"]
                        }
                    )

                # Also check line items inside the claim itself
                if hasattr(claim, "services") and claim.services:
                    service_codes = [s.service_code for s in claim.services]
                    if partner_code in service_codes:
                        return RuleResult(
                            rule_code=self.rule_code,
                            rule_name=self.rule_name,
                            triggered=True,
                            risk_contribution=weight,
                            severity=severity,
                            reason=f"Claim line items contain mutually exclusive procedures: {claim.procedure_code} and {partner_code}. {pair['reason']}",
                            evidence={
                                "claimed_procedure": claim.procedure_code,
                                "incompatible_line_item": partner_code,
                                "rationale": pair["reason"]
                            }
                        )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="No mutually exclusive or anatomically contradictory procedure combinations detected."
        )
