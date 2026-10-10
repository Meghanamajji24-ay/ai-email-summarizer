def test_health_endpoints(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "service" in data

    api_health = client.get("/api/health")
    assert api_health.status_code == 200
    assert api_health.json()["status"] == "healthy"

    root_resp = client.get("/")
    assert root_resp.status_code == 200
