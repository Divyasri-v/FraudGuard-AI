from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult

class UnsupportedServicesRule(BaseRule):
    rule_code = "UNSUPPORTED_SERVICES"
    rule_name = "Unsupported Services Detection"
    default_severity = "MEDIUM"
    default_weight = 36.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check documentation and pre-authorization status
        missing_items = []
        has_medical_record = claim.supporting_document_status in ["COMPLETE", "VERIFIED"]
        has_auth = claim.authorization_status in ["PRE_APPROVED", "APPROVED", "VERIFIED"]
        has_invoice = claim.claimed_amount > 0 and claim.supporting_document_status != "MISSING"

        if claim.supporting_document_status in ["MISSING", "INCOMPLETE"]:
            missing_items.append("Supporting Invoice / Bills")
            if claim.claimed_amount > 15000:
                missing_items.append("Detailed Discharge Summary / Medical Record")

        if claim.authorization_status in ["MISSING", "REJECTED"]:
            missing_items.append("Prior Authorization Approval")

        if missing_items:
            checklist = [
                f"{'✓' if has_medical_record else '✗'} Medical Record",
                f"{'✓' if has_auth else '✗'} Prior Authorization",
                f"{'✓' if has_invoice else '✗'} Supporting Invoice"
            ]
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_contribution=weight,
                severity=severity,
                reason=f"Claim lacks mandatory evidentiary support: {', '.join(missing_items)}. Document Checklist: {' | '.join(checklist)}.",
                evidence={
                    "missing_items": missing_items,
                    "checklist": checklist,
                    "supporting_document_status": claim.supporting_document_status,
                    "authorization_status": claim.authorization_status,
                    "claimed_amount": claim.claimed_amount
                }
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="All mandatory synthetic supporting documents and authorizations are documented."
        )
