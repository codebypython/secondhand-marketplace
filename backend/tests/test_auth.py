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
