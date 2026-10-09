import pytest
from datetime import datetime
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

# In-memory SQLite for testing
TEST_ENGINE = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=TEST_ENGINE)
    db = TestingSessionLocal()

    # Seed patient
    p = Patient(
        patient_id="PAT_TEST_01",
        synthetic_name="Demo Test Patient",
        age=35,
        gender="Male",
        city="Metro Apex",
        insurance_plan="Gold Plan",
        registration_date="2026-01-01"
    )
    db.add(p)

    # Seed provider
    prov = Provider(
        provider_id="HSP_TEST_01",
        provider_name="Test General Hospital",
        provider_type="Tertiary Hospital",
        city="Metro Apex",
        specialization="General Medicine",
        historical_claim_count=100,
        historical_suspicious_rate=0.05,
        provider_risk_score=20.0
    )
    db.add(prov)
    db.commit()

    yield db
    db.close()

def test_password_hashing_and_jwt():
    pwd = "SecureTestPassword@123"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    token = create_access_token(subject="analyst@fraudguard.demo", role="Fraud Analyst")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "analyst@fraudguard.demo"
    assert payload["role"] == "Fraud Analyst"

def test_duplicate_billing_rule(test_db):
    rule = DuplicateBillingRule()

    # Create Claim 1
    c1 = Claim(
        claim_id="CLM_DUP_01",
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
    test_db.add(c1)
    test_db.commit()

    # Claim 2 is identical
    c2 = Claim(
        claim_id="CLM_DUP_02",
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
    test_db.add(c2)
    test_db.commit()

    res = rule.evaluate(c2, test_db)
    assert res.triggered is True
    assert res.rule_code == "DUPLICATE_BILLING"
    assert res.risk_contribution > 0

def test_inflated_billing_rule(test_db):
    rule = InflatedBillingRule()

    normal_claim = Claim(
        claim_id="CLM_NORM_01",
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
    res_normal = rule.evaluate(normal_claim, test_db)
    assert res_normal.triggered is False

    inflated_claim = Claim(
        claim_id="CLM_INF_01",
        patient_id="PAT_TEST_01",
        provider_id="HSP_TEST_01",
        service_date="2026-04-05",
        submission_date="2026-04-06",
        diagnosis_code="J18.9",
        procedure_code="PROC_CONSULT_LVL2",
        service_type="Consultation",
        claimed_amount=3500.0,
        expected_amount=1500.0
    )
    res_inf = rule.evaluate(inflated_claim, test_db)
    assert res_inf.triggered is True
    assert res_inf.rule_code == "INFLATED_BILLING"

def test_unsupported_services_rule(test_db):
    rule = UnsupportedServicesRule()

    missing_claim = Claim(
        claim_id="CLM_UNSUP_01",
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
    res = rule.evaluate(missing_claim, test_db)
    assert res.triggered is True
    assert "✓" in res.reason or "✗" in res.reason

def test_mutually_exclusive_services_rule(test_db):
    rule = MutuallyExclusiveServicesRule()

    c_open = Claim(
        claim_id="CLM_APP_OPEN",
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
    test_db.add(c_open)
    test_db.commit()

    c_lap = Claim(
        claim_id="CLM_APP_LAP",
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
    test_db.add(c_lap)
    test_db.commit()

    res = rule.evaluate(c_lap, test_db)
    assert res.triggered is True
    assert res.rule_code == "MUTUALLY_EXCLUSIVE"

def test_risk_scoring_engine():
    score = risk_scoring_engine.calculate_hybrid_score(rule_score=80.0, ml_score=60.0)
    # Default 70% rule, 30% ml: 80*0.7 + 60*0.3 = 56 + 18 = 74.0
    assert 73.0 <= score <= 75.0

    level_low = risk_scoring_engine.get_risk_level(25.0)
    assert level_low == "LOW"

    level_crit = risk_scoring_engine.get_risk_level(88.0)
    assert level_crit == "CRITICAL"
