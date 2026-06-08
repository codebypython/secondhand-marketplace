from sqlalchemy import Column, ForeignKey, Table, UniqueConstraint

from app.db.base import Base
from app.models.mixins import UUIDSqlType

user_favorite_listing = Table(
    "user_favorite_listing",
    Base.metadata,
    Column("user_id", UUIDSqlType, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("listing_id", UUIDSqlType, ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("user_id", "listing_id", name="uq_user_listing_favorite"),
)

conversation_participant = Table(
    "conversation_participant",
    Base.metadata,
    Column(
        "conversation_id",
        UUIDSqlType,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("user_id", UUIDSqlType, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

# Per-user message deletion tracking.
# Instead of globally soft-deleting a message (hiding it for both parties),
# this table records which user has deleted which message from their view only.
message_deleted_for = Table(
    "message_deleted_for",
    Base.metadata,
    Column("message_id", UUIDSqlType, ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUIDSqlType, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("message_id", "user_id", name="uq_message_deleted_for_user"),
)

