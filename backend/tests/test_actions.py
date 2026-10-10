def test_action_items_crud(client, auth_user_and_token):
    headers = auth_user_and_token["headers"]

    # Create task
    task_payload = {
        "title": "Review Q4 Financial Report",
        "description": "Double-check tax liabilities and expenses",
        "due_date": "2026-10-31",
        "priority": "high",
        "status": "pending"
    }
    create_resp = client.post("/api/actions", headers=headers, json=task_payload)
    assert create_resp.status_code == 201
    created_task = create_resp.json()
    task_id = created_task["id"]
    assert created_task["title"] == "Review Q4 Financial Report"
    assert created_task["status"] == "pending"

    # List tasks
    list_resp = client.get("/api/actions", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1
    assert list_resp.json()["pending_count"] >= 1

    # Update task (mark completed)
    update_resp = client.patch(f"/api/actions/{task_id}", headers=headers, json={"status": "completed"})
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "completed"

    # Delete task
    del_resp = client.delete(f"/api/actions/{task_id}", headers=headers)
    assert del_resp.status_code == 200

    # Verify deleted
    list_after = client.get("/api/actions", headers=headers)
    assert not any(t["id"] == task_id for t in list_after.json()["tasks"])
