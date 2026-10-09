from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import ServiceEvent

class FalseClaimRule(BaseRule):
    rule_code = "FALSE_CLAIM"
    rule_name = "False Claim Detection"
    default_severity = "CRITICAL"
    default_weight = 45.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check encounter record for patient on the date
        event = db.query(ServiceEvent).filter(
            ServiceEvent.patient_id == claim.patient_id,
            ServiceEvent.event_date == claim.service_date
        ).first()

        if event:
            mismatches = []
            if event.provider_id != claim.provider_id:
                mismatches.append(f"Provider mismatch (Encounter Provider: {event.provider_id} vs Claimed: {claim.provider_id})")
            
            # Check if event was cancelled or no-show
            if event.status in ["CANCELLED", "NO_SHOW"]:
                mismatches.append(f"Encounter record shows patient appointment was '{event.status}', yet billing claim was generated")

            if mismatches:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Synthetic encounter discrepancy: {'; '.join(mismatches)}.",
                    evidence={
                        "encounter_id": event.event_id,
                        "encounter_provider": event.provider_id,
                        "claimed_provider": claim.provider_id,
                        "encounter_status": event.status,
                        "mismatches": mismatches
                    }
                )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="Claim details are consistent with synthetic encounter log."
        )
