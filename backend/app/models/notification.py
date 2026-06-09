from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import NotificationType
from app.models.mixins import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    recipient_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notification_type"),
        default=NotificationType.SYSTEM,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    link: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    recipient: Mapped[User] = relationship(back_populates="notifications")
