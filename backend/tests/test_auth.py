def test_register_and_login(client):
    # Test Registration
    reg_data = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "SecurePassword123!"
    }
    resp = client.post("/api/auth/register", json=reg_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["name"] == "Jane Doe"
    assert "token" in data

    # Test Duplicate Registration
    dup_resp = client.post("/api/auth/register", json=reg_data)
    assert dup_resp.status_code == 400

    # Test Login
    login_resp = client.post("/api/auth/login", json={
        "email": "jane@example.com",
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "token" in login_data

    # Test Login with Invalid Password
    bad_login = client.post("/api/auth/login", json={
        "email": "jane@example.com",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

def test_me_and_logout(client, auth_user_and_token):
    headers = auth_user_and_token["headers"]

    # Test /me
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "test@example.com"

    # Test logout
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

def test_forgot_and_reset_password(client):
    # Register user
    client.post("/api/auth/register", json={
        "name": "Reset User",
        "email": "reset@example.com",
        "password": "OldPassword123!"
    })

    # Request password reset
    forgot_resp = client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    assert forgot_resp.status_code == 200
    reset_token = forgot_resp.json().get("demo_reset_token")
    assert reset_token is not None

    # Reset password with token
    reset_resp = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "new_password": "BrandNewPassword123!"
    })
    assert reset_resp.status_code == 200

    # Verify login with new password
    login_resp = client.post("/api/auth/login", json={
        "email": "reset@example.com",
        "password": "BrandNewPassword123!"
    })
    assert login_resp.status_code == 200
