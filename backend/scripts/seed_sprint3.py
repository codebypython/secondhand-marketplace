import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import text
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionFactory, build_engine
from app.models.enums import ItemCondition, UserRole, ListingStatus, OfferStatus, DealStatus, DeliveryStatus, MeetupStatus
from app.models.listing import Category, Listing
from app.models.transaction import Deal, Meetup, Offer
from app.models.user import Profile, User


def seed() -> None:
    settings = get_settings()
    engine = build_engine(settings.database_url)
    Base.metadata.create_all(engine)

    with SessionFactory() as session:
        print("Clearing existing data using TRUNCATE CASCADE...")
        # TRUNCATE CASCADE is Postgres-specific and very effective for clearing all tables
        session.execute(text("TRUNCATE TABLE users, profiles, categories, listings, offers, deals, meetups, conversations, messages, reports, reviews, user_follows, wishlists, wishlist_items, listing_questions RESTART IDENTITY CASCADE"))
        session.commit()

        print("Creating users...")
        password = hash_password("Password123!")
        
        # Admin
        admin = User(
            email="admin@market.com",
            password_hash=password,
            role=UserRole.ADMIN,
            profile=Profile(full_name="Market Administrator", display_name="Admin")
        )
        session.add(admin)

        # 10 Sellers
        sellers = []
        for i in range(1, 11):
            s = User(
                email=f"seller{i}@test.com",
                password_hash=password,
                profile=Profile(
                    full_name=f"Seller Number {i}",
                    display_name=f"Shop_{i}",
                    bio=f"Chuyên đồ cũ chất lượng cao số {i}",
                    avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed=seller{i}"
                )
            )
            sellers.append(s)
            session.add(s)

        # 10 Buyers
        buyers = []
        for i in range(1, 11):
            b = User(
                email=f"buyer{i}@test.com",
                password_hash=password,
                profile=Profile(
                    full_name=f"Buyer Number {i}",
                    display_name=f"User_{i}",
                    avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed=buyer{i}"
                )
            )
            buyers.append(b)
            session.add(b)
        
        session.commit()

        print("Creating categories...")
        cat_data = [
            ("Điện tử", "dien-tu", "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200"),
            ("Thời trang", "thoi-trang", "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200"),
            ("Đồ gia dụng", "do-gia-dung", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200"),
            ("Sách & Giải trí", "sach-giai-tri", "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200"),
            ("Xe cộ", "xe-co", "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200"),
        ]
        categories = []
        for name, slug, img in cat_data:
            c = Category(name=name, slug=slug, image_url=img)
            categories.append(c)
            session.add(c)
        session.commit()

        print("Creating listings...")
        listings = []
        for i in range(30):
            seller = sellers[i % 10]
            cat = categories[i % 5]
            l = Listing(
                owner=seller,
                category=cat,
                title=f"Sản phẩm demo #{i+1} - {cat.name}",
                description=f"Đây là mô tả chi tiết cho sản phẩm #{i+1}. Hàng còn mới, sử dụng tốt, đầy đủ phụ kiện.",
                price=Decimal(str(100 + i * 50)),
                condition=ItemCondition.LIKE_NEW if i % 3 == 0 else ItemCondition.USED,
                brand="Samsung" if i % 2 == 0 else "Apple",
                has_warranty=i % 4 == 0,
                image_urls=[f"https://picsum.photos/seed/{i}/800/600"],
                location_data={"lat": 21.0285 + (i * 0.001), "lng": 105.8542 + (i * 0.001), "address": f"Số {i} Đường Láng, Hà Nội"},
                status=ListingStatus.AVAILABLE
            )
            listings.append(l)
            session.add(l)
        session.commit()

        print("Creating Sprint 3 transaction flows...")
        
        # 1. Active Negotiation (Counter-offer flow)
        l1 = listings[0]
        b1 = buyers[0]
        off1 = Offer(listing=l1, buyer=b1, price=Decimal("450"), status=OfferStatus.COUNTERED, expires_at=datetime.now(UTC) - timedelta(hours=1))
        session.add(off1)
        session.flush()
        
        off2 = Offer(
            listing=l1, buyer=b1, price=Decimal("475"), 
            status=OfferStatus.PENDING, 
            expires_at=datetime.now(UTC) + timedelta(hours=4),
            parent_offer_id=off1.id,
            is_counter_from_seller=True
        )
        session.add(off2)

        # 2. Expired Offer
        off_exp = Offer(
            listing=listings[1], buyer=buyers[1], price=Decimal("100"),
            status=OfferStatus.PENDING,
            expires_at=datetime.now(UTC) - timedelta(minutes=10)
        )
        session.add(off_exp)

        # 3. Deal in SHIPPING status
        l3 = listings[2]
        l3.status = ListingStatus.RESERVED
        d1 = Deal(
            listing=l3, buyer=buyers[2], seller=l3.owner, 
            agreed_price=l3.price, status=DealStatus.OPEN,
            delivery_status=DeliveryStatus.SHIPPING,
            tracking_code="SPX_V3_DEMO_123"
        )
        session.add(d1)

        # 4. Deal with a Dispute
        l4 = listings[3]
        l4.status = ListingStatus.RESERVED
        d2 = Deal(
            listing=l4, buyer=buyers[3], seller=l4.owner,
            agreed_price=l4.price, status=DealStatus.OPEN,
            has_dispute=True,
            dispute_reason="Sản phẩm bị vỡ màn hình khi nhận được, không giống như ảnh."
        )
        session.add(d2)

        # 5. Deal with a Scheduled Meetup
        l5 = listings[4]
        l5.status = ListingStatus.RESERVED
        d3 = Deal(listing=l5, buyer=buyers[4], seller=l5.owner, agreed_price=l5.price, status=DealStatus.OPEN)
        m1 = Meetup(
            deal=d3, 
            scheduled_at=datetime.now(UTC) + timedelta(days=1),
            location={"lat": 21.0173, "lng": 105.8122, "address": "Quán Cafe Starbucks Duy Tân"}
        )
        session.add_all([d3, m1])

        # 6. Completed Transactions
        for i in range(5, 8):
            l = listings[i]
            l.status = ListingStatus.SOLD
            d = Deal(listing=l, buyer=buyers[i], seller=l.owner, agreed_price=l.price, status=DealStatus.COMPLETED)
            session.add(d)

        session.commit()
        print("Seeding completed successfully!")


if __name__ == "__main__":
    seed()
