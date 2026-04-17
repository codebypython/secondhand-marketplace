from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import DealStatus, MeetupStatus, OfferStatus
from app.schemas.common import ORMModel


class OfferCreate(BaseModel):
    listing_id: UUID
    price: Decimal = Field(ge=0)


class OfferRead(ORMModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID
    price: Decimal
    status: OfferStatus
    created_at: datetime
    listing_title: str | None = None


class MeetupCreate(BaseModel):
    deal_id: UUID
    scheduled_at: datetime
    location: dict | None = None


class MeetupRead(ORMModel):
    id: UUID
    deal_id: UUID
    scheduled_at: datetime
    location: dict | None = None
    status: MeetupStatus
    created_at: datetime


class DealRead(ORMModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID
    seller_id: UUID
    agreed_price: Decimal
    status: DealStatus
    created_at: datetime
    listing_title: str | None = None
    meetups: list[MeetupRead] = []
