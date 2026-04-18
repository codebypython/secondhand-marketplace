from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import DealStatus, DeliveryStatus, MeetupStatus, OfferStatus
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
    parent_offer_id: UUID | None = None
    is_counter_from_seller: bool = False
    expires_at: datetime | None = None
    created_at: datetime
    listing_title: str | None = None

class CounterOfferCreate(BaseModel):
    price: Decimal = Field(ge=0)


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
    buyer_checked_in: bool = False
    seller_checked_in: bool = False
    created_at: datetime


class DealRead(ORMModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID
    seller_id: UUID
    agreed_price: Decimal
    status: DealStatus
    delivery_status: DeliveryStatus
    tracking_code: str | None = None
    has_dispute: bool = False
    dispute_reason: str | None = None
    created_at: datetime
    listing_title: str | None = None
    meetups: list[MeetupRead] = []

class DealDeliveryUpdate(BaseModel):
    delivery_status: DeliveryStatus
    tracking_code: str | None = None

class DealDisputeCreate(BaseModel):
    reason: str = Field(min_length=10, max_length=1000)
