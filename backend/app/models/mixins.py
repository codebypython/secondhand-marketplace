import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Integer, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

UUIDSqlType = PGUUID(as_uuid=True).with_variant(Uuid(as_uuid=True), "sqlite")
JSONBSqlType = JSONB().with_variant(JSON(), "sqlite")


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUIDSqlType, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        if not self.is_deleted:
            now = datetime.now(UTC)
            self.deleted_at = now
            if hasattr(self, "updated_at"):
                self.updated_at = now

    def restore(self) -> None:
        if self.is_deleted:
            self.deleted_at = None
            if hasattr(self, "touch"):
                self.touch()


class VersionMixin:
    version_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    __mapper_args__ = {"version_id_col": version_id}
