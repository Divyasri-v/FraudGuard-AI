from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import ServiceEvent

class PhantomBillingRule(BaseRule):
    rule_code = "PHANTOM_BILLING"
    rule_name = "Phantom Billing Detection"
    default_severity = "CRITICAL"
    default_weight = 45.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check if a synthetic service event exists for this patient, provider, and service date
        event = db.query(ServiceEvent).filter(
            ServiceEvent.patient_id == claim.patient_id,
            ServiceEvent.provider_id == claim.provider_id,
            ServiceEvent.event_date == claim.service_date
        ).first()

        if not event:
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_contribution=weight,
                severity=severity,
                reason="Potential Phantom Billing: Service record not found in synthetic encounter data.",
                evidence={
                    "patient_id": claim.patient_id,
                    "provider_id": claim.provider_id,
                    "service_date": claim.service_date,
                    "encounter_record_found": False,
                    "explanation": "No corresponding clinical intake, admission, or outpatient registration log was found on the claimed date."
                }
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="Verified synthetic encounter record matches claim date and provider."
        )
