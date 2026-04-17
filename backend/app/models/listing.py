from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.associations import user_favorite_listing
from app.models.enums import ItemCondition, ListingStatus
from app.models.mixins import JSONBSqlType, SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.transaction import Deal, Offer
    from app.models.user import User


class Category(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))

    parent: Mapped[Category | None] = relationship(remote_side="Category.id", back_populates="children")
    children: Mapped[list[Category]] = relationship(back_populates="parent")
    listings: Mapped[list[Listing]] = relationship(back_populates="category")


class Listing(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "listings"
    __table_args__ = (CheckConstraint("price >= 0", name="listing_price_non_negative"),)

    owner_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(4000))
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    condition: Mapped[ItemCondition] = mapped_column(
        SAEnum(ItemCondition, name="item_condition"),
        default=ItemCondition.USED,
        nullable=False,
    )
    location_data: Mapped[dict[str, Any] | None] = mapped_column(JSONBSqlType)
    image_urls: Mapped[list[str]] = mapped_column(JSONBSqlType, default=list, nullable=False)
    status: Mapped[ListingStatus] = mapped_column(
        SAEnum(ListingStatus, name="listing_status"),
        default=ListingStatus.AVAILABLE,
        nullable=False,
    )

    owner: Mapped[User] = relationship(back_populates="listings")
    category: Mapped[Category | None] = relationship(back_populates="listings")
    offers: Mapped[list[Offer]] = relationship(back_populates="listing")
    deals: Mapped[list[Deal]] = relationship(back_populates="listing")
    liked_by: Mapped[list[User]] = relationship(
        secondary=user_favorite_listing,
        back_populates="favorites",
    )

    def is_available(self) -> bool:
        return self.status == ListingStatus.AVAILABLE and not self.is_deleted

    def reserve(self) -> None:
        if not self.is_available():
            raise ValueError("Listing is not available")
        self.status = ListingStatus.RESERVED
        self.touch()

    def mark_sold(self) -> None:
        if self.status != ListingStatus.RESERVED:
            raise ValueError("Only reserved listings can be sold")
        self.status = ListingStatus.SOLD
        self.touch()

    def reopen(self) -> None:
        if self.status not in {ListingStatus.RESERVED, ListingStatus.HIDDEN}:
            raise ValueError("Listing cannot be reopened")
        self.status = ListingStatus.AVAILABLE
        self.touch()
