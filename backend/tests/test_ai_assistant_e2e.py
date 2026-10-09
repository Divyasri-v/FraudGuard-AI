"""
End-to-End tests for FraudGuard AI Assistant (Gemini 2.5 Flash + RAG)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.database.session import SessionLocal
from app.models.models import Claim

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token("analyst@fraudguard.demo", "FRAUD_ANALYST")
    return {"Authorization": f"Bearer {token}"}

def test_assistant_unauthenticated():
    res = client.post("/api/assistant/query", json={"question": "What is duplicate billing?"})
    assert res.status_code == 401

def test_assistant_empty_question(auth_headers):
    res = client.post("/api/assistant/query", json={"question": ""}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "Please provide a question" in data["answer"]
    assert data["claim_id"] is None

def test_assistant_domain_rule_inquiry(auth_headers):
    res = client.post("/api/assistant/query", json={"question": "Explain unbundling in medical billing"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["sources"]) > 0
    assert any("Unbundling" in s for s in data["sources"])
    assert "Unbundling" in data["answer"]

def test_assistant_specific_claim(auth_headers):
    db = SessionLocal()
    sample_claim = db.query(Claim).filter(Claim.risk_level.in_(["HIGH", "CRITICAL"])).first()
    assert sample_claim is not None

    res = client.post(
        "/api/assistant/query",
        json={"question": "Why was this claim flagged?", "claim_id": sample_claim.claim_id},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["claim_id"] == sample_claim.claim_id
    assert sample_claim.claim_id in data["answer"]
    assert "evidence_data" in data
    assert data["evidence_data"]["claim_id"] == sample_claim.claim_id
    assert "disclaimer" in data

def test_assistant_invalid_claim_id(auth_headers):
    res = client.post(
        "/api/assistant/query",
        json={"question": "Why was CLM99999999 flagged?"},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "could not locate claim" in data["answer"].lower()

def test_assistant_rag_hybrid_scoring_inquiry(auth_headers):
    res = client.post(
        "/api/assistant/query",
        json={"question": "How does the hybrid risk scoring formula work?"},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "70" in data["answer"] or "hybrid" in data["answer"].lower()
