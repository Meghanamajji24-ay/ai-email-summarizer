import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, AsyncInMemoryDB

@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure tests run against a clean isolated in-memory DB."""
    db_manager.db = AsyncInMemoryDB("test_db")
    db_manager.is_mock = True
    yield
    db_manager.db = AsyncInMemoryDB("test_db")

@pytest.fixture
def client():
    with TestClient(app) as tc:
        yield tc

@pytest.fixture
def auth_user_and_token(client):
    """Registers and logs in a test user, returning the auth headers."""
    register_payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "Password123!"
    }
    resp = client.post("/api/auth/register", json=register_payload)
    data = resp.json()
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}
    return {"user": data["user"], "token": token, "headers": headers}
