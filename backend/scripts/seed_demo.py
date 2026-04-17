from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionFactory, build_engine
from app.models.enums import ItemCondition, UserRole
from app.models.listing import Category, Listing
from app.models.transaction import Deal, Meetup, Offer
from app.models.user import Profile, User


def seed() -> None:
    settings = get_settings()
    engine = build_engine(settings.database_url)
    Base.metadata.create_all(engine)

    with SessionFactory() as session:
        if session.query(User).count() > 0:
            return

        admin = User(
            email="admin@example.com",
            password_hash=hash_password("Password123!"),
            role=UserRole.ADMIN,
            profile=Profile(full_name="Admin"),
        )
        seller = User(
            email="seller@example.com",
            password_hash=hash_password("Password123!"),
            profile=Profile(full_name="Demo Seller"),
        )
        buyer = User(
            email="buyer@example.com",
            password_hash=hash_password("Password123!"),
            profile=Profile(full_name="Demo Buyer"),
        )
        electronics = Category(name="Electronics")
        listing = Listing(
            owner=seller,
            category=electronics,
            title="Used Nintendo Switch",
            description="Includes dock and charger",
            price=240,
            condition=ItemCondition.USED,
            image_urls=["https://images.example.com/switch.jpg"],
            location_data={"city": "Hanoi", "district": "Cau Giay"},
        )
        offer = Offer(listing=listing, buyer=buyer, price=225)
        deal = Deal(listing=listing, buyer=buyer, seller=seller, agreed_price=225)
        meetup = Meetup(
            deal=deal,
            scheduled_at=datetime.now(UTC) + timedelta(days=2),
            location={"address": "123 Nguyen Chi Thanh"},
        )
        session.add_all([admin, seller, buyer, electronics, listing, offer, deal, meetup])
        session.commit()


if __name__ == "__main__":
    seed()
