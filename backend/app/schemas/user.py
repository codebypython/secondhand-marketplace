from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole, UserStatus
from app.schemas.common import ORMModel


class ProfileRead(ORMModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    bio: str | None = None
    display_name: str | None = None
    phone: str | None = None
    address: str | None = None
    dob: date | None = None
    social_links: dict | None = None
    privacy_settings: dict | None = None
    banner_url: str | None = None
    shop_slug: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=1024)
    bio: str | None = Field(default=None, max_length=1000)
    display_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    dob: date | None = Field(default=None)
    social_links: dict | None = Field(default=None)
    privacy_settings: dict | None = Field(default=None)
    banner_url: str | None = Field(default=None, max_length=1024)
    shop_slug: str | None = Field(default=None, max_length=255)


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
