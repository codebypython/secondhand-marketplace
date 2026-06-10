from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import ForeignKey, String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin, UUIDSqlType

if TYPE_CHECKING:
    from app.models.user import User

class LiveRoom(Base, TimestampMixin):
    __tablename__ = "live_rooms"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        unique=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="live_room")

class LiveComment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "live_comments"

    room_owner_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    content: Mapped[str] = mapped_column(String(1000), nullable=False)

    room_owner: Mapped[User] = relationship(foreign_keys=[room_owner_id])
    sender: Mapped[User] = relationship(foreign_keys=[sender_id])
