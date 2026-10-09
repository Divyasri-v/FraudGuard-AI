import unittest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.models.models import Claim, Patient, Provider, ServiceEvent, FraudRule, User
from app.fraud_engine.rules import (
    DuplicateBillingRule, UpcodingRule, UnbundlingRule, PhantomBillingRule,
    FalseClaimRule, InflatedBillingRule, IncorrectBillingRule, UnsupportedServicesRule,
    ImpossibleTimingRule, MutuallyExclusiveServicesRule
)
from app.fraud_engine.scoring import risk_scoring_engine
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

class TestFraudRulesAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        cls.Session = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)
        cls.db = cls.Session()

        # Seed synthetic patient
        cls.patient = Patient(
            patient_id="PAT_TEST_01",
            synthetic_name="Demo Test Patient",
            age=35,
            gender="Male",
            city="Metro Apex",
            insurance_plan="Gold Plan",
            registration_date="2026-01-01"
        )
        cls.db.add(cls.patient)

        # Seed synthetic provider
        cls.provider = Provider(
            provider_id="HSP_TEST_01",
            provider_name="Test General Hospital",
            provider_type="Tertiary Hospital",
            city="Metro Apex",
            specialization="General Medicine",
            historical_claim_count=100,
            historical_suspicious_rate=0.05,
            provider_risk_score=20.0
        )
        cls.db.add(cls.provider)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_security_hashing_and_jwt(self):
        pwd = "SecureTestPassword@123"
        hashed = get_password_hash(pwd)
        self.assertTrue(verify_password(pwd, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))

        token = create_access_token(subject="analyst@fraudguard.demo", role="Fraud Analyst")
        payload = decode_access_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], "analyst@fraudguard.demo")
        self.assertEqual(payload["role"], "Fraud Analyst")

    def test_02_duplicate_billing(self):
        rule = DuplicateBillingRule()
        c1 = Claim(
            claim_id="CLM_TEST_DUP1",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-03-10",
            submission_date="2026-03-11",
            diagnosis_code="J18.9",
            procedure_code="PROC_CONSULT_LVL2",
            service_type="Consultation",
            claimed_amount=1500.0,
            expected_amount=1500.0
        )
        c2 = Claim(
            claim_id="CLM_TEST_DUP2",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-03-10",
            submission_date="2026-03-12",
            diagnosis_code="J18.9",
            procedure_code="PROC_CONSULT_LVL2",
            service_type="Consultation",
            claimed_amount=1500.0,
            expected_amount=1500.0
        )
        self.db.add(c1)
        self.db.add(c2)
        self.db.commit()

        res = rule.evaluate(c2, self.db)
        self.assertTrue(res.triggered)
        self.assertEqual(res.rule_code, "DUPLICATE_BILLING")
        self.assertGreater(res.risk_contribution, 0)

    def test_03_inflated_billing(self):
        rule = InflatedBillingRule()
        normal = Claim(
            claim_id="CLM_TEST_NORM",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-04-01",
            submission_date="2026-04-02",
            diagnosis_code="J18.9",
            procedure_code="PROC_CONSULT_LVL2",
            service_type="Consultation",
            claimed_amount=1600.0,
            expected_amount=1500.0
        )
        res_norm = rule.evaluate(normal, self.db)
        self.assertFalse(res_norm.triggered)

        inflated = Claim(
            claim_id="CLM_TEST_INF",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-04-05",
            submission_date="2026-04-06",
            diagnosis_code="J18.9",
            procedure_code="PROC_CONSULT_LVL2",
            service_type="Consultation",
            claimed_amount=3600.0,
            expected_amount=1500.0
        )
        res_inf = rule.evaluate(inflated, self.db)
        self.assertTrue(res_inf.triggered)
        self.assertEqual(res_inf.rule_code, "INFLATED_BILLING")

    def test_04_unsupported_services(self):
        rule = UnsupportedServicesRule()
        missing = Claim(
            claim_id="CLM_TEST_UNSUP",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-05-01",
            submission_date="2026-05-02",
            diagnosis_code="J18.9",
            procedure_code="PROC_CONSULT_LVL2",
            service_type="Consultation",
            claimed_amount=20000.0,
            expected_amount=1500.0,
            supporting_document_status="MISSING",
            authorization_status="MISSING"
        )
        res = rule.evaluate(missing, self.db)
        self.assertTrue(res.triggered)
        self.assertEqual(res.rule_code, "UNSUPPORTED_SERVICES")

    def test_05_mutually_exclusive(self):
        rule = MutuallyExclusiveServicesRule()
        c_open = Claim(
            claim_id="CLM_TEST_EXCL1",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-06-01",
            submission_date="2026-06-02",
            diagnosis_code="K35.8",
            procedure_code="PROC_OPEN_APPENDECTOMY",
            service_type="Surgery",
            claimed_amount=38000.0,
            expected_amount=38000.0
        )
        c_lap = Claim(
            claim_id="CLM_TEST_EXCL2",
            patient_id="PAT_TEST_01",
            provider_id="HSP_TEST_01",
            service_date="2026-06-01",
            submission_date="2026-06-02",
            diagnosis_code="K35.8",
            procedure_code="PROC_LAP_APPENDECTOMY",
            service_type="Surgery",
            claimed_amount=42000.0,
            expected_amount=42000.0
        )
        self.db.add(c_open)
        self.db.add(c_lap)
        self.db.commit()

        res = rule.evaluate(c_lap, self.db)
        self.assertTrue(res.triggered)
        self.assertEqual(res.rule_code, "MUTUALLY_EXCLUSIVE")

    def test_06_risk_scoring(self):
        score = risk_scoring_engine.calculate_hybrid_score(rule_score=80.0, ml_score=60.0)
        self.assertTrue(73.0 <= score <= 75.0)

        self.assertEqual(risk_scoring_engine.get_risk_level(20.0), "LOW")
        self.assertEqual(risk_scoring_engine.get_risk_level(45.0), "MEDIUM")
        self.assertEqual(risk_scoring_engine.get_risk_level(75.0), "HIGH")
        self.assertEqual(risk_scoring_engine.get_risk_level(92.0), "CRITICAL")

if __name__ == "__main__":
    unittest.main(verbosity=2)
