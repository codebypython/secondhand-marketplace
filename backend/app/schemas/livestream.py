from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.common import ORMModel
from app.schemas.user import UserRead

class LiveRoomUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    preview_url: str | None = Field(default=None, max_length=1024)
    tags: str | None = Field(default=None, max_length=255)
    is_live: bool | None = None
    is_online: bool | None = None

class LiveRoomRead(ORMModel):
    user_id: UUID
    title: str | None = None
    preview_url: str | None = None
    tags: str | None = None
    is_live: bool
    is_online: bool
    user: UserRead

class LiveCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)

class LiveCommentRead(ORMModel):
    id: UUID
    room_owner_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    sender: UserRead
