from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult

class InflatedBillingRule(BaseRule):
    rule_code = "INFLATED_BILLING"
    rule_name = "Inflated Billing Detection"
    default_severity = "HIGH"
    default_weight = 38.0
    default_threshold = 1.5

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity
        threshold = rule_config.threshold if rule_config and rule_config.threshold else self.default_threshold

        expected = max(claim.expected_amount, 1.0)
        ratio = claim.claimed_amount / expected

        if ratio >= threshold:
            pct_over = round((ratio - 1.0) * 100, 1)
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_contribution=weight,
                severity=severity,
                reason=f"Claim amount ₹{claim.claimed_amount:,.2f} is {ratio:.2f}× ({pct_over}% above) synthetic benchmark of ₹{expected:,.2f} (threshold: {threshold:.2f}×).",
                evidence={
                    "claimed_amount": claim.claimed_amount,
                    "expected_amount": expected,
                    "inflation_ratio": round(ratio, 2),
                    "threshold": threshold,
                    "excess_amount": round(claim.claimed_amount - expected, 2)
                }
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason=f"Claim amount ratio ({ratio:.2f}×) is within acceptable tariff benchmark (< {threshold:.2f}×)."
        )
