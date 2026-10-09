from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import Claim

# Synthetic bundles: A master procedure code and its individual component codes
BUNDLED_PROCEDURES = {
    "PROC_LAP_CHOLE": {
        "name": "Laparoscopic Cholecystectomy Comprehensive Package",
        "components": ["PROC_LAP_ACCESS", "PROC_GALL_EXC", "PROC_TROCAR_INS", "PROC_INTRA_CHOLANG"]
    },
    "PROC_CARD_CATH_PKG": {
        "name": "Diagnostic Cardiac Catheterization Comprehensive",
        "components": ["PROC_COR_ANGIO", "PROC_VENTRIC", "PROC_VASC_CLOSURE"]
    },
    "PROC_TOTAL_KNEE_PKG": {
        "name": "Total Knee Arthroplasty Comprehensive",
        "components": ["PROC_KNEE_PREP", "PROC_IMPLANT_CEMENT", "PROC_DRAIN_INSERT"]
    }
}

class UnbundlingRule(BaseRule):
    rule_code = "UNBUNDLING"
    rule_name = "Unbundling Detection"
    default_severity = "HIGH"
    default_weight = 38.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check if the claim contains component codes that belong to a single bundled procedure
        for bundle_code, info in BUNDLED_PROCEDURES.items():
            if claim.procedure_code in info["components"]:
                # Check if other claims exist on the same date for the same patient with sibling components
                sibling_claims = db.query(Claim).filter(
                    Claim.claim_id != claim.claim_id,
                    Claim.patient_id == claim.patient_id,
                    Claim.service_date == claim.service_date,
                    Claim.procedure_code.in_(info["components"])
                ).all()

                if sibling_claims:
                    sibling_codes = [c.procedure_code for c in sibling_claims]
                    return RuleResult(
                        rule_code=self.rule_code,
                        rule_name=self.rule_name,
                        triggered=True,
                        risk_contribution=weight,
                        severity=severity,
                        reason=f"Claim code '{claim.procedure_code}' is a component of bundled procedure '{info['name']}'. Sibling component claims ({', '.join(sibling_codes)}) billed separately on the same date.",
                        evidence={
                            "bundled_procedure": info["name"],
                            "master_code": bundle_code,
                            "current_component": claim.procedure_code,
                            "other_components": sibling_codes,
                            "service_date": claim.service_date
                        }
                    )

        # Check line items on the claim itself (ClaimService)
        if hasattr(claim, "services") and claim.services:
            service_codes = [s.service_code for s in claim.services]
            for bundle_code, info in BUNDLED_PROCEDURES.items():
                matched_components = [c for c in service_codes if c in info["components"]]
                if len(matched_components) > 1:
                    return RuleResult(
                        rule_code=self.rule_code,
                        rule_name=self.rule_name,
                        triggered=True,
                        risk_contribution=weight,
                        severity=severity,
                        reason=f"Multiple separate line items ({', '.join(matched_components)}) submitted that belong to single bundled package '{info['name']}'.",
                        evidence={
                            "bundled_package": info["name"],
                            "master_code": bundle_code,
                            "fragmented_components": matched_components
                        }
                    )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="No fragmented bundled billing patterns detected."
        )
