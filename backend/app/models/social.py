from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.listing import Listing
    from app.models.transaction import Deal

class UserFollow(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_follows"

    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_user_follows_follower_following"),
        CheckConstraint("follower_id != following_id", name="ck_user_follows_not_self"),
    )

class Review(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reviews"

    reviewer_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)
    
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        CheckConstraint("reviewer_id != target_id", name="ck_reviews_not_self"),
    )

class Wishlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlists"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="wishlists")
    items: Mapped[list[WishlistItem]] = relationship(back_populates="wishlist", cascade="all, delete-orphan")

class WishlistItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlist_items"

    wishlist_id: Mapped[str] = mapped_column(ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False)
    listing_id: Mapped[str] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)

    wishlist: Mapped[Wishlist] = relationship(back_populates="items")
    listing: Mapped[Listing] = relationship()

    __table_args__ = (
        UniqueConstraint("wishlist_id", "listing_id", name="uq_wishlist_items_wishlist_listing"),
    )

class ListingQuestion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "listing_questions"

    listing_id: Mapped[str] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    asker_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    
    listing: Mapped[Listing] = relationship(back_populates="questions")
