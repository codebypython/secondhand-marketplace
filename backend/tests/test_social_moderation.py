from uuid import UUID

from app.models.enums import UserRole
from app.models.user import User
from tests.conftest import auth_headers


def test_chat_block_and_report_flow(client, register_user, session):
    seller = register_user("seller@example.com", full_name="Seller")
    buyer = register_user("buyer@example.com", full_name="Buyer")
    admin = register_user("admin@example.com", full_name="Admin")

    admin_user = session.get(User, UUID(admin["user"]["id"]))
    admin_user.role = UserRole.ADMIN
    session.add(admin_user)
    session.commit()

    listing_response = client.post(
        "/api/v1/listings",
        headers=auth_headers(seller["access_token"]),
        json={
            "title": "Desk lamp",
            "description": "Warm light",
            "price": 30,
            "condition": "USED",
            "image_urls": [],
        },
    )
    listing_id = listing_response.json()["id"]

    conversation_response = client.post(
        "/api/v1/chat/conversations",
        headers=auth_headers(buyer["access_token"]),
        json={
            "participant_ids": [seller["user"]["id"]],
            "listing_id": listing_id,
            "title": "Interested in your lamp",
        },
    )
    assert conversation_response.status_code == 201
    conversation_id = conversation_response.json()["id"]

    message_response = client.post(
        "/api/v1/chat/messages",
        headers=auth_headers(buyer["access_token"]),
        json={"conversation_id": conversation_id, "content": "Is it still available?"},
    )
    assert message_response.status_code == 201

    block_response = client.post(
        "/api/v1/moderation/blocks",
        headers=auth_headers(seller["access_token"]),
        json={"blocked_id": buyer["user"]["id"]},
    )
    assert block_response.status_code == 201

    blocked_message_response = client.post(
        "/api/v1/chat/messages",
        headers=auth_headers(buyer["access_token"]),
        json={"conversation_id": conversation_id, "content": "Following up"},
    )
    assert blocked_message_response.status_code == 400

    report_response = client.post(
        "/api/v1/moderation/reports",
        headers=auth_headers(buyer["access_token"]),
        json={
            "target_type": "LISTING",
            "target_id": listing_id,
            "reason": "Spam listing",
        },
    )
    assert report_response.status_code == 201
    report_id = report_response.json()["id"]

    review_response = client.patch(
        f"/api/v1/moderation/reports/{report_id}",
        headers=auth_headers(admin["access_token"]),
        json={"status": "RESOLVED"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "RESOLVED"
