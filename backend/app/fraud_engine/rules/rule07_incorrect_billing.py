from typing import Any, Optional
from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.models.models import Patient

# Synthetic clinical incompatibility rules between diagnosis and procedure
INCOMPATIBLE_DIAG_PROC = {
    "J18.9": ["PROC_CATARACT_SURG", "PROC_KNEE_REPLACE", "PROC_DENTAL_EXTRACT"], # Pneumonia vs cataract/knee
    "K29.7": ["PROC_CRANIOTOMY", "PROC_CESAREAN"], # Gastritis vs brain surgery
    "M54.5": ["PROC_CARDIAC_BYPASS", "PROC_TONSILLECTOMY"], # Low back pain vs bypass
    "E11.9": ["PROC_APPENDECTOMY_OPEN"] # Diabetes alone without appendicitis
}

# Gender specific procedures
GENDER_RESTRICTIONS = {
    "PROC_CESAREAN": "Female",
    "PROC_HYSTERECTOMY": "Female",
    "PROC_PROSTATECTOMY": "Male",
    "PROC_VASECTOMY": "Male"
}

class IncorrectBillingRule(BaseRule):
    rule_code = "INCORRECT_BILLING"
    rule_name = "Incorrect Billing Detection"
    default_severity = "HIGH"
    default_weight = 36.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        weight = rule_config.default_weight if rule_config else self.default_weight
        severity = rule_config.severity if rule_config else self.default_severity

        # Check gender compatibility with patient record
        patient = db.query(Patient).filter(Patient.patient_id == claim.patient_id).first()
        if patient and claim.procedure_code in GENDER_RESTRICTIONS:
            required_gender = GENDER_RESTRICTIONS[claim.procedure_code]
            if patient.gender != required_gender:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Clinical mismatch: Procedure '{claim.procedure_code}' requires patient biological sex '{required_gender}', but synthetic patient {patient.patient_id} is registered as '{patient.gender}'.",
                    evidence={
                        "patient_gender": patient.gender,
                        "required_gender": required_gender,
                        "procedure_code": claim.procedure_code,
                        "diagnosis_code": claim.diagnosis_code
                    }
                )

        # Check diagnosis-procedure clinical match
        if claim.diagnosis_code in INCOMPATIBLE_DIAG_PROC:
            incompatibles = INCOMPATIBLE_DIAG_PROC[claim.diagnosis_code]
            if claim.procedure_code in incompatibles:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_contribution=weight,
                    severity=severity,
                    reason=f"Diagnosis-procedure mismatch: Primary diagnosis {claim.diagnosis_code} does not justify or support procedure {claim.procedure_code}.",
                    evidence={
                        "diagnosis_code": claim.diagnosis_code,
                        "procedure_code": claim.procedure_code,
                        "mismatch_type": "CLINICAL_JUSTIFICATION_FAILURE"
                    }
                )

        # Quantity anomaly
        if claim.quantity > 5 and claim.service_type in ["Surgery", "Major Procedure", "Inpatient"]:
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_contribution=weight,
                severity=severity,
                reason=f"Suspicious quantity ({claim.quantity} units) billed for major single-instance procedure.",
                evidence={
                    "quantity": claim.quantity,
                    "service_type": claim.service_type,
                    "procedure_code": claim.procedure_code
                }
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_contribution=0.0,
            severity="LOW",
            reason="Procedure, diagnosis, and demographic parameters align with synthetic clinical billing rules."
        )
