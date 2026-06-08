from uuid import UUID
from app.models.enums import UserRole
from app.models.user import User
from tests.conftest import auth_headers

def test_dispute_and_resolve_flow(client, register_user, session):
    # Register seller, buyer, admin
    seller = register_user("seller_disp@example.com", full_name="Seller")
    buyer = register_user("buyer_disp@example.com", full_name="Buyer")
    admin = register_user("admin_disp@example.com", full_name="Admin")
    
    # Make admin an ADMIN
    admin_user = session.get(User, UUID(admin["user"]["id"]))
    admin_user.role = UserRole.ADMIN
    session.add(admin_user)
    session.commit()
    
    # Create listing
    listing_response = client.post(
        "/api/v1/listings",
        headers=auth_headers(seller["access_token"]),
        json={
            "title": "Disputed Bike",
            "description": "Needs review",
            "price": 300,
            "condition": "USED",
            "image_urls": [],
        },
    )
    assert listing_response.status_code == 201
    listing_id = listing_response.json()["id"]
    
    # Create offer
    offer_response = client.post(
        "/api/v1/transactions/offers",
        headers=auth_headers(buyer["access_token"]),
        json={"listing_id": listing_id, "price": 280},
    )
    assert offer_response.status_code == 201
    offer_id = offer_response.json()["id"]
    
    # Accept offer (creates Deal)
    accept_response = client.post(
        f"/api/v1/transactions/offers/{offer_id}/accept",
        headers=auth_headers(seller["access_token"]),
    )
    assert accept_response.status_code == 200
    deal_id = accept_response.json()["id"]
    
    # File dispute
    dispute_response = client.post(
        f"/api/v1/transactions/deals/{deal_id}/dispute",
        headers=auth_headers(buyer["access_token"]),
        json={"reason": "Bike is completely broken and has flat tires"},
    )
    assert dispute_response.status_code == 200
    assert dispute_response.json()["has_dispute"] is True
    
    # Get active disputes (as Admin)
    disputes_list = client.get(
        "/api/v1/moderation/disputes",
        headers=auth_headers(admin["access_token"]),
    )
    assert disputes_list.status_code == 200
    assert any(d["id"] == deal_id for d in disputes_list.json())
    
    # Non-admin cannot resolve dispute
    resolve_attempt = client.post(
        f"/api/v1/moderation/disputes/{deal_id}/resolve",
        headers=auth_headers(buyer["access_token"]),
        json={"resolution": "CANCELLED"},
    )
    assert resolve_attempt.status_code == 403
    
    # Resolve dispute as CANCELLED (as Admin)
    resolve_response = client.post(
        f"/api/v1/moderation/disputes/{deal_id}/resolve",
        headers=auth_headers(admin["access_token"]),
        json={"resolution": "CANCELLED"},
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "CANCELLED"
    assert resolve_response.json()["has_dispute"] is False
    
    # Listing should be AVAILABLE again
    listing_after = client.get(f"/api/v1/listings/{listing_id}")
    assert listing_after.json()["status"] == "AVAILABLE"


def test_transactional_reviews_flow(client, register_user, session):
    seller = register_user("seller_rev@example.com", full_name="Seller")
    buyer = register_user("buyer_rev@example.com", full_name="Buyer")
    stranger = register_user("stranger@example.com", full_name="Stranger")
    
    # Create listing
    listing_response = client.post(
        "/api/v1/listings",
        headers=auth_headers(seller["access_token"]),
        json={
            "title": "Reviewable Table",
            "description": "Good table",
            "price": 100,
            "condition": "LIKE_NEW",
            "image_urls": [],
        },
    )
    listing_id = listing_response.json()["id"]
    
    # Create offer
    offer_response = client.post(
        "/api/v1/transactions/offers",
        headers=auth_headers(buyer["access_token"]),
        json={"listing_id": listing_id, "price": 100},
    )
    offer_id = offer_response.json()["id"]
    
    # Accept offer
    accept_response = client.post(
        f"/api/v1/transactions/offers/{offer_id}/accept",
        headers=auth_headers(seller["access_token"]),
    )
    deal_id = accept_response.json()["id"]
    
    # Try to review before deal is completed -> should fail
    review_fail_1 = client.post(
        f"/api/v1/users/{seller['user']['id']}/reviews",
        headers=auth_headers(buyer["access_token"]),
        json={"deal_id": deal_id, "rating": 5, "comment": "Nice table!"},
    )
    assert review_fail_1.status_code == 400
    assert "not completed" in review_fail_1.json()["detail"]
    
    # Complete deal
    complete_response = client.post(
        f"/api/v1/transactions/deals/{deal_id}/complete",
        headers=auth_headers(buyer["access_token"]),
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "COMPLETED"
    
    # Try to review as stranger -> should fail
    review_fail_2 = client.post(
        f"/api/v1/users/{seller['user']['id']}/reviews",
        headers=auth_headers(stranger["access_token"]),
        json={"deal_id": deal_id, "rating": 5, "comment": "Spam review"},
    )
    assert review_fail_2.status_code == 403
    
    # Try to review wrong target -> should fail
    review_fail_3 = client.post(
        f"/api/v1/users/{stranger['user']['id']}/reviews",
        headers=auth_headers(buyer["access_token"]),
        json={"deal_id": deal_id, "rating": 5, "comment": "Reviewing stranger instead of seller"},
    )
    assert review_fail_3.status_code == 400
    assert "other participant" in review_fail_3.json()["detail"]
    
    # Review seller successfully
    review_ok = client.post(
        f"/api/v1/users/{seller['user']['id']}/reviews",
        headers=auth_headers(buyer["access_token"]),
        json={"deal_id": deal_id, "rating": 5, "comment": "Awesome trader!"},
    )
    assert review_ok.status_code == 201
    assert review_ok.json()["rating"] == 5
    
    # Try to review seller again for same deal -> should fail (duplicate)
    review_dup = client.post(
        f"/api/v1/users/{seller['user']['id']}/reviews",
        headers=auth_headers(buyer["access_token"]),
        json={"deal_id": deal_id, "rating": 4, "comment": "Double review"},
    )
    assert review_dup.status_code == 400
    assert "already reviewed" in review_dup.json()["detail"]
