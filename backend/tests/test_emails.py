def test_email_flow(client, auth_user_and_token):
    headers = auth_user_and_token["headers"]

    # Seed demo emails via demo-connect
    connect_resp = client.post("/api/gmail/demo-connect", headers=headers)
    assert connect_resp.status_code == 200

    # Get emails list
    emails_resp = client.get("/api/emails", headers=headers)
    assert emails_resp.status_code == 200
    data = emails_resp.json()
    assert data["total"] > 0
    assert len(data["emails"]) > 0

    first_email = data["emails"][0]
    email_id = first_email["id"]

    # Get email detail
    detail_resp = client.get(f"/api/emails/{email_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == email_id
    assert detail["summary"] is not None
    assert len(detail["summary"]["summary"]) > 0

    # Test Summarize Regeneration
    regen_resp = client.post(f"/api/emails/{email_id}/summarize", headers=headers, json={"summary_length": "concise"})
    assert regen_resp.status_code == 200
    regen_summary = regen_resp.json()
    assert "summary" in regen_summary

    # Test Suggest Reply
    reply_resp = client.post(f"/api/emails/{email_id}/suggest-reply", headers=headers, json={"tone": "friendly"})
    assert reply_resp.status_code == 200
    assert len(reply_resp.json()["suggested_reply"]) > 0

    # Test Toggle Read Status
    read_resp = client.patch(f"/api/emails/{email_id}/read-status?is_read=false", headers=headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is False

    # Test Delete Email
    del_resp = client.delete(f"/api/emails/{email_id}", headers=headers)
    assert del_resp.status_code == 200
