from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.notification import NotificationRead, UnreadCount
from app.services.notification import (
    get_unread_count,
    list_notifications,
    mark_all_read,
    mark_as_read,
)

router = APIRouter()


@router.get("", response_model=list[NotificationRead])
def get_notifications(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    return list_notifications(session, recipient_id=str(current_user.id))


@router.get("/unread-count", response_model=UnreadCount)
def get_unread_notifications_count(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    return UnreadCount(count=get_unread_count(session, recipient_id=str(current_user.id)))


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def read_notification(
    notification_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return mark_as_read(session, recipient_id=str(current_user.id), notification_id=str(notification_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/read-all", status_code=status.HTTP_200_OK)
def read_all_notifications(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    mark_all_read(session, recipient_id=str(current_user.id))
    return {"status": "success", "message": "All notifications marked as read"}
