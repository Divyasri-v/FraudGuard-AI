from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import Claim

class DuplicateBillingRule(BaseRule):
    rule_code = "DUPLICATE_BILLING"
    rule_name = "Duplicate Billing Detection"
    default_severity = "HIGH"
    default_weight = 38.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check for another claim with same patient, same provider, same procedure, same date
        duplicates = db.query(Claim).filter(
            Claim.claim_id != claim.claim_id,
            Claim.patient_id == claim.patient_id,
            Claim.provider_id == claim.provider_id,
            Claim.procedure_code == claim.procedure_code,
            Claim.service_date == claim.service_date
        ).all()

        if duplicates:
            matching_ids = [d.claim_id for d in duplicates]
            amounts = [d.claimed_amount for d in duplicates]
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_contribution=weight,
                severity=severity,
                reason=f"Multiple identical service submissions detected for synthetic patient {claim.patient_id} on {claim.service_date}.",
                evidence={
                    "matching_claim_ids": matching_ids,
                    "matching_amounts": amounts,
                    "procedure_code": claim.procedure_code,
                    "service_date": claim.service_date,
                    "duplicate_count": len(duplicates)
                }
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="No duplicate submissions found for this patient, provider, and procedure date."
        )
