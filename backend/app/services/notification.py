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

    # Broadcast real-time notification via WebSocket if active
    try:
        import asyncio
        from app.api.v1.endpoints.chat import manager

        payload = {
            "type": "notification",
            "id": str(notification.id),
            "notification_type": type.value if hasattr(type, "value") else type,
            "title": title,
            "message": message,
            "link": link,
            "created_at": notification.created_at.isoformat() if notification.created_at else None
        }

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.send_personal_message(payload, str(recipient_id)))
        except RuntimeError:
            asyncio.run(manager.send_personal_message(payload, str(recipient_id)))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to send real-time WebSocket notification: %s", e)

    return notification


def list_notifications(session: Session, recipient_id: str, limit: int = 50) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(
            Notification.recipient_id == recipient_id,
            Notification.type.in_([NotificationType.SYSTEM, NotificationType.REPORT_RESOLVED])
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt))


def get_unread_count(session: Session, recipient_id: str) -> int:
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_id == recipient_id,
            Notification.is_read == False,
            Notification.type.in_([NotificationType.SYSTEM, NotificationType.REPORT_RESOLVED])
        )
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
        .where(
            Notification.recipient_id == recipient_id,
            Notification.is_read == False,
            Notification.type.in_([NotificationType.SYSTEM, NotificationType.REPORT_RESOLVED])
        )
        .values(is_read=True)
    )
    session.execute(stmt)
    session.commit()
