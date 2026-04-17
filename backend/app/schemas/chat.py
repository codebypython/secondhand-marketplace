from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserRead


class ConversationCreate(BaseModel):
    participant_ids: list[UUID] = Field(min_length=1)
    listing_id: UUID | None = None
    title: str | None = Field(default=None, max_length=255)


class MessageCreate(BaseModel):
    conversation_id: UUID
    content: str = Field(min_length=1, max_length=4000)


class MessageRead(ORMModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    sender: UserRead | None = None


class ConversationRead(ORMModel):
    id: UUID
    title: str | None = None
    listing_id: UUID | None = None
    created_at: datetime
    participants: list[UserRead]
    messages: list[MessageRead] = []
