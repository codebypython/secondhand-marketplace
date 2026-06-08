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


def test_per_user_message_deletion(client, register_user, session):
    seller = register_user("seller_del@example.com", full_name="Seller")
    buyer = register_user("buyer_del@example.com", full_name="Buyer")

    # Create listing
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

    # Create conversation
    conversation_response = client.post(
        "/api/v1/chat/conversations",
        headers=auth_headers(buyer["access_token"]),
        json={
            "participant_ids": [seller["user"]["id"]],
            "listing_id": listing_id,
            "title": "Interested in your lamp",
        },
    )
    conversation_id = conversation_response.json()["id"]

    # Send message from buyer
    message_response = client.post(
        "/api/v1/chat/messages",
        headers=auth_headers(buyer["access_token"]),
        json={"conversation_id": conversation_id, "content": "Is it still available?"},
    )
    message_id = message_response.json()["id"]

    # Delete message as buyer
    delete_response = client.delete(
        f"/api/v1/chat/messages/{message_id}",
        headers=auth_headers(buyer["access_token"]),
    )
    assert delete_response.status_code == 204

    # Verify message is hidden for buyer
    get_conv_buyer = client.get(
        f"/api/v1/chat/conversations/{conversation_id}",
        headers=auth_headers(buyer["access_token"]),
    )
    assert get_conv_buyer.status_code == 200
    assert len(get_conv_buyer.json()["messages"]) == 0

    # Verify message is STILL visible for seller
    get_conv_seller = client.get(
        f"/api/v1/chat/conversations/{conversation_id}",
        headers=auth_headers(seller["access_token"]),
    )
    assert get_conv_seller.status_code == 200
    assert len(get_conv_seller.json()["messages"]) == 1
    assert get_conv_seller.json()["messages"][0]["id"] == message_id

