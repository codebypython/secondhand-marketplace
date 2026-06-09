from datetime import datetime
from uuid import UUID
from app.models.enums import NotificationType
from app.schemas.common import ORMModel


class NotificationRead(ORMModel):
    id: UUID
    recipient_id: UUID
    type: NotificationType
    title: str
    message: str
    link: str
    is_read: bool
    created_at: datetime
    updated_at: datetime


class UnreadCount(ORMModel):
    count: int
