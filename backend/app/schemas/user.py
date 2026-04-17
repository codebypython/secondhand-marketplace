from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole, UserStatus
from app.schemas.common import ORMModel


class ProfileRead(ORMModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    bio: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=1024)
    bio: str | None = Field(default=None, max_length=1000)


class UserRead(ORMModel):
    id: UUID
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: datetime
    profile: ProfileRead | None = None


class UserPublicRead(ORMModel):
    id: UUID
    created_at: datetime
    profile: ProfileRead | None = None
