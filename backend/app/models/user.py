from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import date
from sqlalchemy import Date, Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.db.base import Base
from app.models.associations import conversation_participant, user_favorite_listing
from app.models.enums import UserRole, UserStatus
from app.models.mixins import JSONBSqlType, SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.chat import Conversation, Message
    from app.models.listing import Listing
    from app.models.transaction import Deal, Offer
    from app.models.social import UserFollow, Review, Wishlist


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"),
        default=UserRole.USER,
        nullable=False,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status"),
        default=UserStatus.ACTIVE,
        nullable=False,
    )

    profile: Mapped[Profile | None] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    listings: Mapped[list[Listing]] = relationship(back_populates="owner")
    offers: Mapped[list[Offer]] = relationship(back_populates="buyer", foreign_keys="Offer.buyer_id")
    deals_as_buyer: Mapped[list[Deal]] = relationship(
        foreign_keys="Deal.buyer_id",
        back_populates="buyer",
    )
    deals_as_seller: Mapped[list[Deal]] = relationship(
        foreign_keys="Deal.seller_id",
        back_populates="seller",
    )
    messages: Mapped[list[Message]] = relationship(back_populates="sender")
    favorites: Mapped[list[Listing]] = relationship(
        secondary=user_favorite_listing,
        back_populates="liked_by",
    )
    conversations: Mapped[list[Conversation]] = relationship(
        secondary=conversation_participant,
        back_populates="participants",
    )
    wishlists: Mapped[list[Wishlist]] = relationship(back_populates="user", cascade="all, delete-orphan")
    followers: Mapped[list[UserFollow]] = relationship(foreign_keys="UserFollow.following_id", cascade="all, delete-orphan")
    following: Mapped[list[UserFollow]] = relationship(foreign_keys="UserFollow.follower_id", cascade="all, delete-orphan")
    reviews_received: Mapped[list[Review]] = relationship(foreign_keys="Review.target_id", cascade="all, delete-orphan")
    reviews_given: Mapped[list[Review]] = relationship(foreign_keys="Review.reviewer_id")

    @validates("email")
    def validate_email(self, _key: str, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("Invalid email")
        return normalized

    def ensure_active(self) -> None:
        if self.status != UserStatus.ACTIVE:
            raise ValueError("User account is not active")


class Profile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    bio: Mapped[str | None] = mapped_column(String(1000))
    
    display_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(500))
    dob: Mapped[date | None] = mapped_column(Date)
    social_links: Mapped[dict | None] = mapped_column(JSONBSqlType)
    privacy_settings: Mapped[dict | None] = mapped_column(JSONBSqlType)
    banner_url: Mapped[str | None] = mapped_column(String(1024))
    shop_slug: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)

    user: Mapped[User] = relationship(back_populates="profile")
