import pytest
from unittest.mock import patch, MagicMock
from app.models.enums import NotificationType, UserRole
from app.services.notification import create_notification
from app.services.audit import log_activity
from app.services.ai import classify_image_via_ai
from app.schemas.audit import ActivityLogRead


def test_notifications_lifecycle(client, session, register_user):
    user_data = register_user("test_notif@example.com")
    token = user_data["access_token"]
    user_id = user_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a notification
    notif = create_notification(
        session,
        recipient_id=user_id,
        type=NotificationType.SYSTEM,
        title="Test Notification",
        message="This is a test notification message",
        link="/dashboard",
    )
    assert str(notif.recipient_id) == str(user_id)
    assert notif.is_read is False

    # 2. Get unread count via endpoint
    resp = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["count"] == 1

    # 3. List notifications
    resp = client.get("/api/v1/notifications", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["title"] == "Test Notification"

    # 4. Mark notification as read
    resp = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    # 5. Check unread count is 0
    resp = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert resp.json()["count"] == 0


def test_activity_logging(client, session, register_user):
    # Register admin to view logs
    admin_data = register_user("admin_audit@example.com")
    admin_token = admin_data["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Make the user admin in DB
    from app.models.user import User
    admin = session.get(User, admin_data["user"]["id"])
    admin.role = UserRole.ADMIN
    session.add(admin)
    session.commit()

    # Log a dummy activity
    log_activity(
        session,
        actor_id=str(admin.id),
        verb="test_action",
        target_type="System",
        target_id="sys-123",
        details={"info": "extra information"},
    )

    # Fetch audit logs via admin endpoint
    resp = client.get("/api/v1/moderation/audit-logs", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1
    assert logs[0]["verb"] == "test_action"
    assert logs[0]["actor_email"] == "admin_audit@example.com"
    assert logs[0]["details"]["info"] == "extra information"


@patch("app.services.ai.httpx.Client")
def test_ai_mock_moderation_logic(mock_client_class, client, session, register_user):
    user_data = register_user("seller_ai@example.com")
    token = user_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Configure mock client
    mock_client = MagicMock()
    mock_client_class.return_value.__enter__.return_value = mock_client

    # Scenario 1: Knife image (prohibited)
    mock_resp_get1 = MagicMock()
    mock_resp_get1.content = b"fake-image-bytes"
    mock_resp_get1.raise_for_status = MagicMock()
    
    mock_resp_post1 = MagicMock()
    mock_resp_post1.json.return_value = {
        "is_prohibited": True,
        "primary_class": "weapon",
        "prohibited_reason": "Vũ khí/Dao kéo nguy hiểm (Phát hiện bởi AI)",
        "confidence": 0.95,
        "mock": True
    }
    mock_resp_post1.raise_for_status = MagicMock()

    # Mock get and post responses sequentially or based on URL
    def mock_request(method, url, *args, **kwargs):
        if method == "GET":
            return mock_resp_get1
        elif method == "POST":
            return mock_resp_post1
        return MagicMock()

    mock_client.get.return_value = mock_resp_get1
    mock_client.post.return_value = mock_resp_post1

    # Test classify endpoint directly
    resp = client.post("/api/v1/listings/classify?image_url=http://example.com/weapon_knife.jpg", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_prohibited"] is True
    assert "weapon" in data["primary_class"]

    # Scenario 2: Normal image (iphone)
    mock_resp_post2 = MagicMock()
    mock_resp_post2.json.return_value = {
        "is_prohibited": False,
        "primary_class": "electronics",
        "category_slug": "dien-tu",
        "category_name": "Điện tử",
        "confidence": 0.94,
        "mock": True
    }
    mock_resp_post2.raise_for_status = MagicMock()
    mock_client.post.return_value = mock_resp_post2

    resp = client.post("/api/v1/listings/classify?image_url=http://example.com/iphone.jpg", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_prohibited"] is False
    assert data["category_slug"] == "dien-tu"
