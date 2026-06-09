from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import JSONBSqlType, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class ActivityLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "activity_logs"

    actor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    verb: Mapped[str] = mapped_column(String(255), nullable=False)
    target_type: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    target_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    details: Mapped[dict | None] = mapped_column(JSONBSqlType, nullable=True)

    actor: Mapped[User | None] = relationship(back_populates="activities")
