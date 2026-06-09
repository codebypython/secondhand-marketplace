from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.enums import NotificationType


def create_notification(
    session: Session,
    recipient_id: str,
    type: NotificationType,
    title: str,
    message: str = "",
    link: str = "",
) -> Notification:
    notification = Notification(
        recipient_id=recipient_id,
        type=type,
        title=title,
        message=message,
        link=link,
        is_read=False,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def list_notifications(session: Session, recipient_id: str, limit: int = 50) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.recipient_id == recipient_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt))


def get_unread_count(session: Session, recipient_id: str) -> int:
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == recipient_id, Notification.is_read == False)
    )
    return session.scalar(stmt) or 0


def mark_as_read(session: Session, recipient_id: str, notification_id: str) -> Notification:
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.recipient_id == recipient_id,
    )
    notification = session.scalar(stmt)
    if not notification:
        raise ValueError("Notification not found")
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def mark_all_read(session: Session, recipient_id: str) -> None:
    stmt = (
        update(Notification)
        .where(Notification.recipient_id == recipient_id, Notification.is_read == False)
        .values(is_read=True)
    )
    session.execute(stmt)
    session.commit()
