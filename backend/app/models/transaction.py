from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DealStatus, MeetupStatus, OfferStatus
from app.models.mixins import JSONBSqlType, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class Offer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "offers"
    __table_args__ = (CheckConstraint("price >= 0", name="offer_price_non_negative"),)

    listing_id: Mapped[str] = mapped_column(
        ForeignKey("listings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[OfferStatus] = mapped_column(
        SAEnum(OfferStatus, name="offer_status"),
        default=OfferStatus.PENDING,
        nullable=False,
    )

    listing: Mapped[Listing] = relationship(back_populates="offers")
    buyer: Mapped[User] = relationship(back_populates="offers", foreign_keys=[buyer_id])

    def accept(self) -> Deal:
        if self.status != OfferStatus.PENDING:
            raise ValueError("Only pending offers can be accepted")
        if not self.listing.is_available():
            raise ValueError("Listing is not available")
        self.status = OfferStatus.ACCEPTED
        self.listing.reserve()
        return Deal(
            listing_id=self.listing_id,
            buyer_id=self.buyer_id,
            seller_id=self.listing.owner_id,
            agreed_price=self.price,
            status=DealStatus.OPEN,
        )

    def decline(self) -> None:
        if self.status != OfferStatus.PENDING:
            raise ValueError("Only pending offers can be declined")
        self.status = OfferStatus.DECLINED

    def cancel(self) -> None:
        if self.status != OfferStatus.PENDING:
            raise ValueError("Only pending offers can be cancelled")
        self.status = OfferStatus.CANCELLED


class Deal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "deals"
    __table_args__ = (CheckConstraint("agreed_price >= 0", name="deal_price_non_negative"),)

    listing_id: Mapped[str] = mapped_column(
        ForeignKey("listings.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    agreed_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[DealStatus] = mapped_column(
        SAEnum(DealStatus, name="deal_status"),
        default=DealStatus.OPEN,
        nullable=False,
    )

    listing: Mapped[Listing] = relationship(back_populates="deals")
    buyer: Mapped[User] = relationship(foreign_keys=[buyer_id], back_populates="deals_as_buyer")
    seller: Mapped[User] = relationship(foreign_keys=[seller_id], back_populates="deals_as_seller")
    meetups: Mapped[list[Meetup]] = relationship(back_populates="deal", cascade="all, delete-orphan")

    def complete(self, listing: Listing) -> None:
        if self.status != DealStatus.OPEN:
            raise ValueError("Deal is not open")
        self.status = DealStatus.COMPLETED
        listing.mark_sold()

    def cancel(self, listing: Listing) -> None:
        if self.status != DealStatus.OPEN:
            raise ValueError("Deal is not open")
        self.status = DealStatus.CANCELLED
        listing.reopen()


class Meetup(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "meetups"

    deal_id: Mapped[str] = mapped_column(
        ForeignKey("deals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(nullable=False)
    location: Mapped[dict[str, Any] | None] = mapped_column(JSONBSqlType)
    status: Mapped[MeetupStatus] = mapped_column(
        SAEnum(MeetupStatus, name="meetup_status"),
        default=MeetupStatus.SCHEDULED,
        nullable=False,
    )

    deal: Mapped[Deal] = relationship(back_populates="meetups")
