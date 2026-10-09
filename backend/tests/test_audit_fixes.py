from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.database.session import SessionLocal
from app.models.models import Claim, Investigation, Notification, Provider

def test_full_features():
    db = SessionLocal()
    client = TestClient(app)
    token = create_access_token("analyst@fraudguard.demo", "FRAUD_ANALYST")
    headers = {"Authorization": f"Bearer {token}"}
    inv_token = create_access_token("investigator@fraudguard.demo", "INVESTIGATOR")
    inv_headers = {"Authorization": f"Bearer {inv_token}"}

    print("=== 1. VERIFY CLAIMS & REVIEW QUEUE FLOW ===")
    total_claims = db.query(Claim).count()
    print(f"Total claims in database: {total_claims} (Constraint: exactly 10,000)")
    assert total_claims >= 10000

    sample_claim = db.query(Claim).filter(Claim.risk_level.in_(["HIGH", "CRITICAL"])).first()
    assert sample_claim is not None, "No high/critical claim found"
    print(f"Testing claim: {sample_claim.claim_id}")

    # Test GET /api/claims/{sample_claim.claim_id}
    r_claim = client.get(f"/api/claims/{sample_claim.claim_id}", headers=headers)
    assert r_claim.status_code == 200, f"Claim fetch failed: {r_claim.text}"
    claim_json = r_claim.json()
    assert claim_json["claim_id"] == sample_claim.claim_id
    assert "patient" in claim_json and "synthetic_name" in claim_json["patient"]
    assert "provider" in claim_json and "provider_name" in claim_json["provider"]
    assert "detections" in claim_json
    print(f"Claim loaded: ID={claim_json['claim_id']}, Score={claim_json['hybrid_score']}, Risk={claim_json['risk_level']}")

    # Test Review Queue
    r_rq = client.get("/api/review-queue?page=1&page_size=5", headers=headers)
    assert r_rq.status_code == 200, f"Review queue failed: {r_rq.text}"
    rq_json = r_rq.json()
    assert len(rq_json["items"]) > 0
    first_rq_claim_id = rq_json["items"][0]["claim_id"]
    r_rq_claim = client.get(f"/api/claims/{first_rq_claim_id}", headers=headers)
    assert r_rq_claim.status_code == 200
    print(f"Review queue eye icon destination /claims/{first_rq_claim_id}: 200 OK")

    # Verify Investigator cannot access Claims or Review Queue
    r_inv_claims = client.get("/api/claims", headers=inv_headers)
    assert r_inv_claims.status_code == 403, "Investigator should be forbidden from listing all claims"
    r_inv_rq = client.get("/api/review-queue", headers=inv_headers)
    assert r_inv_rq.status_code == 403, "Investigator should be forbidden from accessing review queue"

    print("\n=== 2. VERIFY INVESTIGATION & INSPECT CLAIM FLOW ===")
    sample_inv = db.query(Investigation).first()
    assert sample_inv is not None, "No investigation found"
    print(f"Testing investigation ID={sample_inv.id}, Case={sample_inv.case_number}, Claim={sample_inv.claim_id}")
    # Fraud Analyst cannot access investigations
    r_analyst_inv = client.get(f"/api/investigations/{sample_inv.id}", headers=headers)
    assert r_analyst_inv.status_code == 403, "Fraud Analyst should be forbidden from investigations"
    # Investigator can access investigations
    r_inv = client.get(f"/api/investigations/{sample_inv.id}", headers=inv_headers)
    assert r_inv.status_code == 200, f"Investigation fetch failed: {r_inv.text}"
    inv_json = r_inv.json()
    target_claim_id = inv_json.get("claim_id") or (inv_json.get("claim") and inv_json["claim"]["claim_id"])
    assert target_claim_id is not None
    # Investigator can inspect claim associated with investigation
    r_inv_claim = client.get(f"/api/claims/{target_claim_id}", headers=inv_headers)
    assert r_inv_claim.status_code == 200
    print(f"Investigation Inspect Claim /claims/{target_claim_id}: 200 OK")

    print("\n=== 3. VERIFY ALL 4 REPORTS ENDPOINTS & CSV EXPORTS ===")
    r_sum = client.get("/api/reports/fraud-summary", headers=headers)
    assert r_sum.status_code == 200
    assert "metrics" in r_sum.json()
    print(f"Report 1 (Fraud Summary): 200 OK (total={r_sum.json()['metrics']['total_claims']})")

    r_prov = client.get("/api/reports/provider-risk", headers=headers)
    assert r_prov.status_code == 200
    assert "data" in r_prov.json()
    assert len(r_prov.json()["data"]) > 0
    print(f"Report 2 (Provider Risk): 200 OK ({len(r_prov.json()['data'])} providers)")

    r_exp = client.get("/api/reports/financial-exposure", headers=headers)
    assert r_exp.status_code == 200
    assert "data" in r_exp.json()
    assert len(r_exp.json()["data"]) > 0
    print(f"Report 3 (Financial Exposure): 200 OK ({len(r_exp.json()['data'])} mechanisms)")

    r_rule = client.get("/api/reports/rule-performance", headers=headers)
    assert r_rule.status_code == 200
    assert "data" in r_rule.json()
    assert len(r_rule.json()["data"]) > 0
    print(f"Report 4 (Rule Performance): 200 OK ({len(r_rule.json()['data'])} rules)")

    for rtype in ["claims", "providers", "investigations", "rules"]:
        r_csv = client.get(f"/api/reports/export/csv?report_type={rtype}", headers=headers)
        assert r_csv.status_code == 200
        assert "# NOTE: SYNTHETIC DEMO DATA" in r_csv.text
        print(f"CSV Export ({rtype}): 200 OK ({len(r_csv.text)} bytes)")

    print("\n=== 4. VERIFY NOTIFICATIONS WORKFLOW & DB PERSISTENCE ===")
    # Reset to unread
    for n in db.query(Notification).all():
        n.is_read = False
    db.commit()

    r_notifs = client.get("/api/notifications", headers=headers)
    assert r_notifs.status_code == 200
    notifs_list = r_notifs.json()
    assert len(notifs_list) > 0

    target_n_id = notifs_list[0]["id"]
    # Mark single read
    r_single_read = client.put(f"/api/notifications/{target_n_id}/read", headers=headers)
    assert r_single_read.status_code == 200
    db.expire_all()
    n_check = db.query(Notification).filter(Notification.id == target_n_id).first()
    assert n_check.is_read is True
    print(f"Mark single read: Notification ID {target_n_id} is_read=True in DB!")

    # Mark all read
    r_all_read = client.put("/api/notifications/read-all", headers=headers)
    assert r_all_read.status_code == 200
    db.expire_all()
    all_notifs = db.query(Notification).all()
    assert all(n.is_read for n in all_notifs)
    print(f"Mark all read: All {len(all_notifs)} notifications is_read=True in DB!")

    print("\nAll 4 feature suites verified successfully!")

if __name__ == "__main__":
    test_full_features()
