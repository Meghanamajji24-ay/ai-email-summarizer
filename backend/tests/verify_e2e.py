import httpx

def test_full_application_flow():
    client = httpx.Client(base_url="http://localhost:8000/api", timeout=15.0)

    # 1. Health
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

    # 2. Registration
    reg_payload = {
        "name": "Sarah Connor",
        "email": "sarah.connor@example.com",
        "password": "SecurePassword123!"
    }
    r = client.post("/auth/register", json=reg_payload)
    assert r.status_code == 201
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Demo Gmail Connect
    r = client.post("/gmail/demo-connect", headers=headers)
    assert r.status_code == 200

    # 4. Dashboard stats
    r = client.get("/dashboard/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_emails_processed"] > 0
    assert stats["high_priority_count"] > 0

    # 5. Emails list & detail
    r = client.get("/emails", headers=headers)
    assert r.status_code == 200
    emails = r.json()["emails"]
    assert len(emails) > 0
    email_id = emails[0]["id"]

    r = client.get(f"/emails/{email_id}", headers=headers)
    assert r.status_code == 200
    detail = r.json()
    assert detail["summary"] is not None
    assert len(detail["summary"]["summary"]) > 0

    # 6. Suggest Reply
    r = client.post(f"/emails/{email_id}/suggest-reply", headers=headers, json={"tone": "friendly"})
    assert r.status_code == 200
    assert len(r.json()["suggested_reply"]) > 0

    # 7. Action items
    r = client.get("/actions", headers=headers)
    assert r.status_code == 200
    tasks = r.json()["tasks"]
    assert len(tasks) > 0
    task_id = tasks[0]["id"]

    r = client.patch(f"/actions/{task_id}", headers=headers, json={"status": "completed"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    # 8. Settings & Export
    r = client.get("/settings", headers=headers)
    assert r.status_code == 200

    r = client.post("/settings/export-data", headers=headers)
    assert r.status_code == 200
    export_data = r.json()
    assert export_data["emails_count"] > 0

if __name__ == "__main__":
    test_full_application_flow()
    print("Full application E2E flow passed successfully!")
