from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserPublicRead

# Reviews
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

class ReviewRead(ORMModel):
    id: UUID
    reviewer: UserPublicRead | None
    target_id: UUID
    deal_id: UUID | None
    rating: int
    comment: str | None
    created_at: datetime

# Wishlist
class WishlistCreate(BaseModel):
    name: str = Field(..., max_length=255)
    is_public: bool = False

class WishlistUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    is_public: bool | None = None

class WishlistItemRead(ORMModel):
    id: UUID
    listing_id: UUID
    created_at: datetime
    # We can omit listing detail to prevent deep nesting, or include simple listing read later

class WishlistRead(ORMModel):
    id: UUID
    name: str
    is_public: bool
    created_at: datetime
    items: list[WishlistItemRead] = []

# Listing Q&A
class QuestionCreate(BaseModel):
    question: str = Field(..., max_length=1000)

class AnswerCreate(BaseModel):
    answer: str = Field(..., max_length=1000)

class QuestionRead(ORMModel):
    id: UUID
    listing_id: UUID
    asker: UserPublicRead | None
    question: str
    answer: str | None
    created_at: datetime
    updated_at: datetime
