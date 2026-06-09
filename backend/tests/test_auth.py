from tests.conftest import auth_headers


def test_register_login_and_profile_update(client, register_user):
    register_result = register_user("alice@example.com", full_name="Alice")
    token = register_result["access_token"]

    me_response = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "alice@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "Password123!"},
    )
    assert login_response.status_code == 200

    patch_response = client.patch(
        "/api/v1/users/me",
        headers=auth_headers(token),
        json={"bio": "Collector of vintage furniture."},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["profile"]["bio"] == "Collector of vintage furniture."


def test_forgot_and_reset_password_flow(client, register_user):
    register_result = register_user("forgot@example.com", full_name="Forgot User")
    
    forgot_response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "forgot@example.com"}
    )
    assert forgot_response.status_code == 200
    assert forgot_response.json()["message"] == "Reset instructions sent to your mailbox."
    
    emails_response = client.get("/api/v1/auth/mock-emails")
    assert emails_response.status_code == 200
    emails = emails_response.json()
    assert len(emails) > 0
    assert emails[0]["recipient"] == "forgot@example.com"
    assert "reset-password?token=" in emails[0]["body"]
    
    body = emails[0]["body"]
    token = body.split("token=")[1].split('"')[0]
    
    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewPassword123!"}
    )
    assert reset_response.status_code == 200
    assert reset_response.json()["message"] == "Password has been reset successfully."
    
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "forgot@example.com", "password": "NewPassword123!"}
    )
    assert login_response.status_code == 200
