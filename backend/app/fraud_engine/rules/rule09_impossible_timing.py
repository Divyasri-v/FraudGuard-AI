from typing import Any, Optional
from datetime import datetime
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import ServiceEvent, Claim, Provider

class ImpossibleTimingRule(BaseRule):
    rule_code = "IMPOSSIBLE_TIMING"
    rule_name = "Impossible Timing Detection"
    default_severity = "HIGH"
    default_weight = 38.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check other claims or events for the same patient on the same service date
        other_claims = db.query(Claim).filter(
            Claim.claim_id != claim.claim_id,
            Claim.patient_id == claim.patient_id,
            Claim.service_date == claim.service_date
        ).all()

        current_prov = db.query(Provider).filter(Provider.provider_id == claim.provider_id).first()
        current_city = current_prov.city if current_prov else "Unknown City"

        for oc in other_claims:
            oc_prov = db.query(Provider).filter(Provider.provider_id == oc.provider_id).first()
            oc_city = oc_prov.city if oc_prov else "Unknown City"

            # If patient is billed at two different cities on the exact same date
            if oc_city != current_city and current_city != "Unknown City" and oc_city != "Unknown City":
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Geographical / timing impossibility: Synthetic patient received service in {current_city} (Provider {claim.provider_id}) and concurrent service in distant fictional city {oc_city} (Provider {oc.provider_id}) on same date {claim.service_date}.",
                    evidence={
                        "patient_id": claim.patient_id,
                        "service_date": claim.service_date,
                        "city_a": current_city,
                        "provider_a": claim.provider_id,
                        "city_b": oc_city,
                        "provider_b": oc.provider_id,
                        "conflicting_claim_id": oc.claim_id
                    }
                )

        # Check ServiceEvents for overlapping or impossible time stamps
        events = db.query(ServiceEvent).filter(
            ServiceEvent.patient_id == claim.patient_id,
            ServiceEvent.event_date == claim.service_date
        ).all()

        if len(events) >= 2:
            locations = list({e.location for e in events if e.location})
            if len(locations) > 1:
                times = [e.event_time for e in events if e.event_time]
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Impossible synthetic schedule: Multiple encounters registered in disconnected facility zones ({', '.join(locations)}) within unviable travel interval ({', '.join(times)}).",
                    evidence={
                        "locations": locations,
                        "encounter_times": times,
                        "event_count": len(events)
                    }
                )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="Service timing and location logs are chronologically and geographically feasible."
        )
