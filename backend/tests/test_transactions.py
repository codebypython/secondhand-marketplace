from tests.conftest import auth_headers


def test_offer_accept_and_complete_deal(client, register_user):
    seller = register_user("seller@example.com", full_name="Seller")
    buyer = register_user("buyer@example.com", full_name="Buyer")

    listing_response = client.post(
        "/api/v1/listings",
        headers=auth_headers(seller["access_token"]),
        json={
            "title": "Road bike",
            "description": "Good condition",
            "price": 500,
            "condition": "USED",
            "image_urls": [],
        },
    )
    listing_id = listing_response.json()["id"]

    offer_response = client.post(
        "/api/v1/transactions/offers",
        headers=auth_headers(buyer["access_token"]),
        json={"listing_id": listing_id, "price": 450},
    )
    assert offer_response.status_code == 201
    offer_id = offer_response.json()["id"]

    accept_response = client.post(
        f"/api/v1/transactions/offers/{offer_id}/accept",
        headers=auth_headers(seller["access_token"]),
    )
    assert accept_response.status_code == 200
    deal_id = accept_response.json()["id"]
    assert accept_response.json()["status"] == "OPEN"

    complete_response = client.post(
        f"/api/v1/transactions/deals/{deal_id}/complete",
        headers=auth_headers(buyer["access_token"]),
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "COMPLETED"

    listing_after = client.get(f"/api/v1/listings/{listing_id}")
    assert listing_after.status_code == 200
    assert listing_after.json()["status"] == "SOLD"
