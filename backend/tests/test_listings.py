from tests.conftest import auth_headers


def test_create_listing_and_toggle_favorite(client, register_user):
    owner = register_user("owner@example.com", full_name="Owner")
    buyer = register_user("buyer@example.com", full_name="Buyer")

    category_response = client.post(
        "/api/v1/listings/categories",
        headers=auth_headers(owner["access_token"]),
        json={"name": "Electronics"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    listing_response = client.post(
        "/api/v1/listings",
        headers=auth_headers(owner["access_token"]),
        json={
            "category_id": category_id,
            "title": "Used Camera",
            "description": "Mirrorless body",
            "price": 250,
            "condition": "USED",
            "image_urls": ["https://example.com/camera.jpg"],
        },
    )
    assert listing_response.status_code == 201
    listing_id = listing_response.json()["id"]

    favorite_response = client.post(
        f"/api/v1/listings/{listing_id}/favorite",
        headers=auth_headers(buyer["access_token"]),
    )
    assert favorite_response.status_code == 200
    assert favorite_response.json()["favorite"] is True

    listings_response = client.get("/api/v1/listings", params={"search": "Camera"})
    assert listings_response.status_code == 200
    assert len(listings_response.json()) == 1
