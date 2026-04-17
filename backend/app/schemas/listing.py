from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ItemCondition, ListingStatus
from app.schemas.common import ORMModel
from app.schemas.user import UserRead


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: UUID | None = None


class CategoryRead(ORMModel):
    id: UUID
    name: str
    parent_id: UUID | None = None


class ListingCreate(BaseModel):
    category_id: UUID | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    price: Decimal = Field(ge=0)
    condition: ItemCondition = ItemCondition.USED
    location_data: dict | None = None
    image_urls: list[str] = Field(default_factory=list)


class ListingUpdate(BaseModel):
    category_id: UUID | None = None
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    price: Decimal | None = Field(default=None, ge=0)
    condition: ItemCondition | None = None
    location_data: dict | None = None
    image_urls: list[str] | None = None
    status: ListingStatus | None = None


class ListingRead(ORMModel):
    id: UUID
    owner_id: UUID
    category_id: UUID | None = None
    title: str
    description: str | None = None
    price: Decimal
    condition: ItemCondition
    location_data: dict | None = None
    image_urls: list[str]
    status: ListingStatus
    created_at: datetime
    updated_at: datetime | None = None
    owner: UserRead | None = None
    category: CategoryRead | None = None


class FavoriteResponse(BaseModel):
    favorite: bool
