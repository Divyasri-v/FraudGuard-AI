"""
End-to-End Test Suite for FraudGuard AI Two-Role System (Fraud Analyst & Investigator)
Testing exact workflows, transitions, RBAC restrictions, notifications, and audit logging.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.models import Claim, Investigation, Notification, AuditLog, User

client = TestClient(app)

def test_two_roles_login_and_database_state():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        # Verify exactly 2 users exist in database
        emails = {u.email for u in users}
        assert emails == {"analyst@fraudguard.demo", "investigator@fraudguard.demo"}, f"Unexpected users: {emails}"
        assert len(users) == 2, f"Expected exactly 2 users, found {len(users)}"
        
        # Test Login API for Fraud Analyst
        r_analyst = client.post("/api/auth/login", json={"email": "analyst@fraudguard.demo", "password": "Analyst@123"})
        assert r_analyst.status_code == 200, f"Analyst login failed: {r_analyst.text}"
        data_analyst = r_analyst.json()
        assert "access_token" in data_analyst
        assert data_analyst["user"]["role"] in ["Fraud Analyst", "FRAUD_ANALYST"]

        # Test Login API for Investigator
        r_inv = client.post("/api/auth/login", json={"email": "investigator@fraudguard.demo", "password": "Investigator@123"})
        assert r_inv.status_code == 200, f"Investigator login failed: {r_inv.text}"
        data_inv = r_inv.json()
        assert "access_token" in data_inv
        assert data_inv["user"]["role"] in ["Investigator", "INVESTIGATOR"]
    finally:
        db.close()

def test_rbac_api_restrictions():
    # Authenticate both users
    r_a = client.post("/api/auth/login", json={"email": "analyst@fraudguard.demo", "password": "Analyst@123"}).json()
    r_i = client.post("/api/auth/login", json={"email": "investigator@fraudguard.demo", "password": "Investigator@123"}).json()
    
    headers_analyst = {"Authorization": f"Bearer {r_a['access_token']}"}
    headers_inv = {"Authorization": f"Bearer {r_i['access_token']}"}
    
    # 1. Investigator trying to access Claims -> 403 Forbidden
    res = client.get("/api/claims", headers=headers_inv)
    assert res.status_code == 403, f"Expected 403 on GET /api/claims for Investigator, got {res.status_code}"
    
    # 2. Investigator trying to Submit Claim -> 403 Forbidden
    res = client.post("/api/claims", json={}, headers=headers_inv)
    assert res.status_code == 403, f"Expected 403 on POST /api/claims for Investigator, got {res.status_code}"
    
    # 3. Investigator trying to access Review Queue -> 403 Forbidden
    res = client.get("/api/review-queue", headers=headers_inv)
    assert res.status_code == 403, f"Expected 403 on GET /api/review-queue for Investigator, got {res.status_code}"
    
    # 4. Fraud Analyst trying to access Investigations -> 403 Forbidden
    res = client.get("/api/investigations", headers=headers_analyst)
    assert res.status_code == 403, f"Expected 403 on GET /api/investigations for Fraud Analyst, got {res.status_code}"

def test_full_analyst_to_investigator_workflow():
    db = SessionLocal()
    try:
        # Step 1: Login as Fraud Analyst
        r_a = client.post("/api/auth/login", json={"email": "analyst@fraudguard.demo", "password": "Analyst@123"}).json()
        headers_analyst = {"Authorization": f"Bearer {r_a['access_token']}"}
        
        # Step 2: Open Review Queue
        res_rq = client.get("/api/review-queue?page=1&page_size=10", headers=headers_analyst)
        assert res_rq.status_code == 200
        rq_items = res_rq.json()["items"]
        assert len(rq_items) > 0
        target_claim_id = rq_items[0]["claim_id"]

        # Step 3: Open suspicious claim
        res_claim = client.get(f"/api/claims/{target_claim_id}", headers=headers_analyst)
        assert res_claim.status_code == 200
        claim_data = res_claim.json()
        assert claim_data["claim_id"] == target_claim_id

        # Step 4 & 5: Analyze and move to UNDER_REVIEW
        res_under_review = client.put(f"/api/review-queue/{target_claim_id}", json={
            "action": "UNDER_REVIEW",
            "note": "Analyst initiating comprehensive triage analysis."
        }, headers=headers_analyst)
        assert res_under_review.status_code == 200
        assert res_under_review.json()["new_status"] == "UNDER_REVIEW"

        # Step 6: Escalate to Investigator
        res_escalate = client.put(f"/api/review-queue/{target_claim_id}", json={
            "action": "ESCALATE",
            "note": "Suspicious upcoding and billing anomalies require field SIU investigation."
        }, headers=headers_analyst)
        assert res_escalate.status_code == 200
        esc_data = res_escalate.json()
        assert esc_data["new_status"] == "ESCALATED"
        assert esc_data["investigation_id"] is not None
        inv_id = esc_data["investigation_id"]

        # Verify investigation status = OPEN
        inv_record = db.query(Investigation).filter(Investigation.id == inv_id).first()
        assert inv_record is not None
        assert inv_record.status == "OPEN"
        assert inv_record.claim_id == target_claim_id

        # Verify notification for Investigator created
        notif = db.query(Notification).filter(
            Notification.user_role == "Investigator",
            Notification.link_url.like(f"%{inv_id}%")
        ).order_by(Notification.created_at.desc()).first()
        assert notif is not None
        assert f"Claim {target_claim_id} has been escalated for investigation." in notif.message

        # Step 7 & 8: Logout and Login as Investigator
        r_i = client.post("/api/auth/login", json={"email": "investigator@fraudguard.demo", "password": "Investigator@123"}).json()
        headers_inv = {"Authorization": f"Bearer {r_i['access_token']}"}

        # Step 9: Open Investigations. Escalated claim must appear.
        res_invs = client.get(f"/api/investigations?search={target_claim_id}", headers=headers_inv)
        assert res_invs.status_code == 200
        inv_list = res_invs.json()["items"]
        assert any(item["claim_id"] == target_claim_id for item in inv_list)

        # Step 10 & 11: Inspect Claim via investigation
        res_inspect = client.get(f"/api/claims/{target_claim_id}", headers=headers_inv)
        assert res_inspect.status_code == 200
        assert res_inspect.json()["claim_id"] == target_claim_id

        # Step 12: Change status OPEN -> IN_PROGRESS
        res_progress = client.put(f"/api/investigations/{inv_id}", json={
            "status": "IN_PROGRESS",
            "recommendation": "Interviewing clinical department head."
        }, headers=headers_inv)
        assert res_progress.status_code == 200
        assert res_progress.json()["status"] == "IN_PROGRESS"

        # Step 13: Add Note and Evidence
        res_note = client.post(f"/api/investigations/{inv_id}/notes", json={
            "content": "Conducted synthetic patient verification interview.",
            "note_type": "INTERVIEW"
        }, headers=headers_inv)
        assert res_note.status_code == 200

        res_ev = client.post(f"/api/investigations/{inv_id}/evidence", json={
            "evidence_type": "SYNTHETIC_INVOICE",
            "description": "Provider submitted reconstructed synthetic invoice.",
            "source": "Hospital billing desk"
        }, headers=headers_inv)
        assert res_ev.status_code == 200

        # Step 14: Final Decision - APPROVE/CLEAR (CLOSED_NO_CONCERN)
        res_close = client.put(f"/api/investigations/{inv_id}", json={
            "status": "CLOSED_NO_CONCERN",
            "recommendation": "Clinical documentation verified. No intentional fraud found."
        }, headers=headers_inv)
        assert res_close.status_code == 200
        assert res_close.json()["status"] == "CLOSED_NO_CONCERN"

        # Step 15: Verify notification for Fraud Analyst and audit logs
        notif_analyst = db.query(Notification).filter(
            Notification.user_role == "Fraud Analyst",
            Notification.message.like(f"%{target_claim_id}%")
        ).order_by(Notification.created_at.desc()).first()
        assert notif_analyst is not None
        assert f"Investigation for Claim {target_claim_id} has been completed." in notif_analyst.message

        # Verify audit logs recorded
        analyst_audits = db.query(AuditLog).filter(
            AuditLog.entity_id == target_claim_id,
            AuditLog.action.in_(["CLAIM_MOVED_TO_UNDER_REVIEW", "CLAIM_ESCALATED"])
        ).all()
        assert len(analyst_audits) >= 2

        inv_audits = db.query(AuditLog).filter(
            AuditLog.entity_id == str(inv_id),
            AuditLog.action.in_(["INVESTIGATION_STARTED", "NOTE_ADDED", "EVIDENCE_ADDED", "CLAIM_APPROVED_CLEARED"])
        ).all()
        assert len(inv_audits) >= 4
    finally:
        db.close()
