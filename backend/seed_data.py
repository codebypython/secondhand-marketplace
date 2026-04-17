"""
Seed script – tạo dữ liệu mẫu cho 20 người dùng với đầy đủ tương tác.

Chạy:  python seed_data.py
Yêu cầu: backend đã start (hoặc DB đã migrate).
"""

import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

# --- Bootstrap app path -------------------------------------------------------
sys.path.insert(0, ".")

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionFactory, build_engine  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models.user import User, Profile  # noqa: E402
from app.models.listing import Category, Listing  # noqa: E402
from app.models.enums import (  # noqa: E402
    DealStatus,
    ItemCondition,
    ListingStatus,
    MeetupStatus,
    OfferStatus,
    ReportStatus,
    ReportTargetType,
    UserRole,
    UserStatus,
)
from app.models.transaction import Deal, Meetup, Offer  # noqa: E402
from app.models.chat import Conversation, Message  # noqa: E402
from app.models.moderation import Block, Report  # noqa: E402
from app.models.associations import user_favorite_listing, conversation_participant  # noqa: E402

# ==============================================================================
# 1. USER DATA
# ==============================================================================
USERS = [
    {"email": "admin@marketplace.vn", "full_name": "Quản Trị Viên", "bio": "Quản trị viên hệ thống Marketplace. Đảm bảo mọi giao dịch diễn ra an toàn.", "role": UserRole.ADMIN},
    {"email": "nguyenvana@gmail.com", "full_name": "Nguyễn Văn An", "bio": "Sinh viên CNTT, hay bán đồ điện tử cũ. Giao dịch uy tín tại TP.HCM."},
    {"email": "tranthib@gmail.com", "full_name": "Trần Thị Bích", "bio": "Mẹ bỉm sữa, bán đồ em bé không dùng nữa. Hàng luôn sạch sẽ."},
    {"email": "levanc@gmail.com", "full_name": "Lê Văn Cường", "bio": "Kỹ sư xây dựng, bán dụng cụ và đồ gia đình."},
    {"email": "phamthid@gmail.com", "full_name": "Phạm Thị Dung", "bio": "Yêu sách, thường bán sách đã đọc xong. Ship toàn quốc."},
    {"email": "hoange@gmail.com", "full_name": "Hoàng Minh Đức", "bio": "Game thủ, chuyên mua bán phụ kiện gaming cũ."},
    {"email": "ngothif@gmail.com", "full_name": "Ngô Thị Phương", "bio": "Nhân viên văn phòng, bán quần áo và phụ kiện thời trang."},
    {"email": "vuvang@gmail.com", "full_name": "Vũ Văn Giang", "bio": "Thợ sửa xe máy, bán phụ tùng xe máy cũ."},
    {"email": "dangthih@gmail.com", "full_name": "Đặng Thị Hương", "bio": "Giáo viên mầm non, bán đồ chơi và sách giáo dục cho trẻ."},
    {"email": "buivani@gmail.com", "full_name": "Bùi Văn Khoa", "bio": "Nhiếp ảnh gia tự do, bán thiết bị nhiếp ảnh."},
    {"email": "dothij@gmail.com", "full_name": "Đỗ Thị Lan", "bio": "Nội trợ, bán đồ gia dụng không dùng nữa."},
    {"email": "trinhminhk@gmail.com", "full_name": "Trịnh Minh Khôi", "bio": "Sinh viên kiến trúc, bán vật liệu mô hình và dụng cụ vẽ."},
    {"email": "lythil@gmail.com", "full_name": "Lý Thị Mai", "bio": "Chủ shop online, thanh lý hàng tồn kho giá tốt."},
    {"email": "nguyenvanm@gmail.com", "full_name": "Nguyễn Văn Nam", "bio": "Dân chơi xe đạp, mua bán xe đạp và phụ kiện."},
    {"email": "phanvano@gmail.com", "full_name": "Phan Văn Phúc", "bio": "Kỹ sư phần mềm, bán linh kiện máy tính cũ."},
    {"email": "truongthip@gmail.com", "full_name": "Trương Thị Quỳnh", "bio": "Mê nấu ăn, bán dụng cụ nhà bếp và gia vị."},
    {"email": "hovanr@gmail.com", "full_name": "Hồ Văn Sơn", "bio": "Thợ điện, bán thiết bị điện tử và công cụ."},
    {"email": "luuthis@gmail.com", "full_name": "Lưu Thị Trang", "bio": "Nhân viên ngân hàng, bán đồ công nghệ cũ."},
    {"email": "maivant@gmail.com", "full_name": "Mai Văn Tú", "bio": "Sinh viên y khoa, bán sách giáo trình và thiết bị học tập."},
    {"email": "caothiu@gmail.com", "full_name": "Cao Thị Uyên", "bio": "Freelancer thiết kế, bán thiết bị đồ họa và sách mỹ thuật."},
]

# ==============================================================================
# 2. CATEGORY DATA
# ==============================================================================
CATEGORIES = [
    "Điện tử", "Thời trang", "Đồ gia dụng", "Sách & Học liệu",
    "Xe cộ & Phụ kiện", "Đồ trẻ em", "Thể thao", "Nhiếp ảnh",
    "Gaming", "Nội thất",
]

# ==============================================================================
# 3. LISTINGS DATA – 4 listings per user (80 total)
# ==============================================================================
PRODUCTS = [
    # (title, description, price, condition, category_index, city)
    ("iPhone 13 Pro Max 256GB", "Máy zin, pin 92%, fullbox. Ngoại hình 9/10.", 12000000, "LIKE_NEW", 0, "TP.HCM"),
    ("MacBook Air M1 2020", "RAM 8GB, SSD 256GB, pin cycle 120. Dùng văn phòng mượt.", 14500000, "USED", 0, "Hà Nội"),
    ("Samsung Galaxy S22 Ultra", "Bản 12/256GB, còn bảo hành 6 tháng.", 10500000, "LIKE_NEW", 0, "Đà Nẵng"),
    ("iPad Pro 11 inch 2021", "M1, wifi, 128GB, có bút Apple Pencil 2.", 11000000, "USED", 0, "TP.HCM"),
    ("AirPods Pro 2", "Mới mua 3 tháng, chống ồn tốt, fullbox.", 3200000, "LIKE_NEW", 0, "Hà Nội"),
    ("Áo khoác da nam size L", "Da thật, mua ở Nhật về, mới mặc 2 lần.", 1800000, "LIKE_NEW", 1, "TP.HCM"),
    ("Đầm dạ hội đính sequin", "Size S, mặc 1 lần duy nhất, giặt sấy sạch sẽ.", 2500000, "LIKE_NEW", 1, "Hà Nội"),
    ("Giày Nike Air Max 97", "Size 42, real, mang vài lần, có bill.", 1200000, "USED", 1, "Đà Nẵng"),
    ("Túi xách Zara da bò", "Hàng auth, màu đen, còn rất mới.", 850000, "LIKE_NEW", 1, "TP.HCM"),
    ("Quần jeans Levi's 501", "Size 32, wash nhẹ, form đẹp.", 600000, "USED", 1, "Cần Thơ"),
    ("Nồi chiên không dầu Philips", "Dung tích 5.5L, dùng 1 năm, còn bảo hành.", 1500000, "USED", 2, "TP.HCM"),
    ("Máy hút bụi Dyson V8", "Pin còn tốt, đầy đủ phụ kiện. Hút mạnh.", 3500000, "USED", 2, "Hà Nội"),
    ("Bộ nồi Fissler Đức", "Inox 18/10, 3 nồi + 1 chảo, dùng 6 tháng.", 4200000, "LIKE_NEW", 2, "Đà Nẵng"),
    ("Quạt điều hòa Midea", "Mới mua hè vừa rồi, còn bảo hành.", 2800000, "LIKE_NEW", 2, "TP.HCM"),
    ("Máy xay sinh tố Vitamix", "Hàng xách tay Mỹ, xay mịn, motor khỏe.", 5500000, "USED", 2, "Hà Nội"),
    ("Harry Potter Trọn Bộ 7 Cuốn", "Bản dịch tiếng Việt, NXB Trẻ, sách đẹp.", 350000, "USED", 3, "TP.HCM"),
    ("Clean Code – Robert C. Martin", "Sách lập trình kinh điển, bản tiếng Anh.", 280000, "USED", 3, "Hà Nội"),
    ("Giáo trình Giải Tích 1", "NXB ĐHQG, ghi chú bút chì có thể tẩy.", 80000, "USED", 3, "Đà Nẵng"),
    ("Bộ sách IELTS Cambridge 15-18", "Kèm đáp án, chưa viết gì vào sách.", 450000, "LIKE_NEW", 3, "TP.HCM"),
    ("Sách Sapiens – Lược sử loài người", "Bản bìa cứng, tình trạng tốt.", 150000, "USED", 3, "Cần Thơ"),
    ("Xe đạp Giant Escape 3", "Frame M, đi 500km, mới thay lốp.", 4500000, "USED", 4, "TP.HCM"),
    ("Mũ bảo hiểm fullface AGV", "Size L, có kính chống sương, nhẹ.", 1800000, "LIKE_NEW", 4, "Hà Nội"),
    ("Yên xe máy Honda SH", "Zin, tháo ra từ xe mới, chưa ngồi.", 500000, "NEW", 4, "Đà Nẵng"),
    ("Baga sau xe máy Exciter", "Inox 304, chắc chắn, lắp dễ dàng.", 350000, "NEW", 4, "TP.HCM"),
    ("Xe trượt scooter Decathlon", "Cho bé 5-10 tuổi, gập gọn, còn mới.", 800000, "LIKE_NEW", 4, "Hà Nội"),
    ("Xe đẩy Combi Đôi", "Nhập Nhật, gấp gọn, sử dụng 1 năm.", 3500000, "USED", 5, "TP.HCM"),
    ("Cũi gỗ em bé Goldcat", "Gỗ tự nhiên, có bánh xe, kèm rèm.", 1200000, "USED", 5, "Hà Nội"),
    ("Đồ chơi Lego Duplo 100 chi tiết", "Hàng chính hãng, sạch sẽ, đủ mảnh.", 600000, "USED", 5, "Đà Nẵng"),
    ("Ghế ăn dặm Mastela", "Gấp gọn, dùng 8 tháng, còn mới 90%.", 800000, "LIKE_NEW", 5, "TP.HCM"),
    ("Bỉm Merries NB90 x 4 bịch", "Hàng xách tay Nhật, chưa dùng.", 900000, "NEW", 5, "Cần Thơ"),
    ("Vợt cầu lông Yonex Astrox 88D", "Gen 3, đã căng cước, kèm túi.", 2500000, "USED", 6, "TP.HCM"),
    ("Bàn bóng bàn Stiga", "Loại gấp gọn, dùng tại nhà, còn tốt.", 3800000, "USED", 6, "Hà Nội"),
    ("Giày chạy bộ Asics Gel Nimbus", "Size 43, chạy 200km, đế còn dày.", 1200000, "USED", 6, "Đà Nẵng"),
    ("Bộ tạ tay 2-10kg", "Gang đúc, bọc cao su, kèm rack.", 2000000, "USED", 6, "TP.HCM"),
    ("Thảm tập yoga TPE 6mm", "2 lớp, chống trượt, kèm túi xách.", 250000, "LIKE_NEW", 6, "Hà Nội"),
    ("Canon EOS R6 Mark II Body", "Shutter count 12k, 2 pin, có hộp.", 35000000, "LIKE_NEW", 7, "TP.HCM"),
    ("Ống kính Sony FE 85mm f/1.4 GM", "Filter kính, hood đầy đủ. Ảnh sắc nét.", 18000000, "USED", 7, "Hà Nội"),
    ("Tripod Manfrotto 055", "Carbon fiber, chân vững, kèm head.", 5500000, "USED", 7, "Đà Nẵng"),
    ("Đèn flash Godox V1", "Đầu tròn, kèm 2 pin, sạc và đế.", 3200000, "LIKE_NEW", 7, "TP.HCM"),
    ("Balo máy ảnh Lowepro", "Chứa 1 body + 3 lens, chống nước.", 1800000, "USED", 7, "Hà Nội"),
    ("PS5 Digital + 2 tay cầm", "Fw mới nhất, kèm GTA V và God of War.", 8500000, "USED", 8, "TP.HCM"),
    ("Bàn phím cơ Keychron K2", "Switch Brown, Bluetooth, có keycap PBT.", 1500000, "LIKE_NEW", 8, "Hà Nội"),
    ("Chuột Logitech G Pro X", "Wireless, sensor HERO 25K, pin 70h.", 900000, "USED", 8, "Đà Nẵng"),
    ("Màn hình LG 27'' 4K IPS", "Cổng USB-C, có kèm cáp và chân đế.", 5200000, "USED", 8, "TP.HCM"),
    ("Tai nghe SteelSeries Arctis 7", "Wireless, pin 24h, mic clear.", 1800000, "LIKE_NEW", 8, "Hà Nội"),
    ("Ghế công thái học Sihoo M57", "Mesh, tựa đầu, điều chỉnh tay vịn.", 3800000, "USED", 9, "TP.HCM"),
    ("Bàn làm việc Flexispot", "Chân nâng hạ điện, mặt gỗ 120x60cm.", 5500000, "USED", 9, "Hà Nội"),
    ("Kệ sách 5 tầng gỗ thông", "Lắp ráp, gia công nhẵn, chưa sơn.", 450000, "NEW", 9, "Đà Nẵng"),
    ("Sofa góc L vải nỉ xám", "2.4m, nệm cao su, dùng 1 năm.", 6500000, "USED", 9, "TP.HCM"),
    ("Đèn bàn LED Xiaomi", "Chỉnh nhiệt độ màu, gấp gọn, USB-C.", 350000, "LIKE_NEW", 9, "Hà Nội"),
    # Extra products
    ("Laptop Dell XPS 13", "i7 Gen 12, RAM 16GB, SSD 512GB, màn OLED.", 18000000, "LIKE_NEW", 0, "TP.HCM"),
    ("Apple Watch Ultra 2", "Titanium, full phụ kiện, bảo hành Apple.", 16000000, "LIKE_NEW", 0, "Hà Nội"),
    ("Máy ảnh Fujifilm X-T5", "Body + lens 18-55mm, shutter 5k.", 28000000, "LIKE_NEW", 7, "Đà Nẵng"),
    ("Nintendo Switch OLED", "Dock + 2 Joy-Con + Zelda TOTK.", 5800000, "USED", 8, "TP.HCM"),
    ("Robot hút bụi Roborock S7", "Tự giặt giẻ, bản MaxV, dùng 6 tháng.", 7500000, "LIKE_NEW", 2, "Hà Nội"),
    ("Xe đạp địa hình Trek Marlin 7", "Frame M, 27.5 inch, Shimano Deore.", 8500000, "USED", 4, "Đà Nẵng"),
    ("Bộ LEGO Technic Porsche 911", "2704 mảnh, đã xếp, có hộp gốc.", 4200000, "USED", 5, "TP.HCM"),
    ("Bộ golf TaylorMade Stealth", "Iron set 5-PW, shaft stiff, grip mới.", 12000000, "USED", 6, "Hà Nội"),
    ("Đàn guitar acoustic Yamaha F310", "Dây mới, thùng đàn nguyên vẹn.", 1800000, "USED", 9, "Cần Thơ"),
    ("Loa JBL Charge 5", "Chống nước IP67, pin 20h, bass mạnh.", 2200000, "LIKE_NEW", 0, "TP.HCM"),
]

# ==============================================================================
# 4. CONVERSATION SNIPPETS
# ==============================================================================
CHAT_MESSAGES = [
    ["Chào bạn, sản phẩm này còn không ạ?", "Dạ còn bạn nhé! Bạn quan tâm để mình gửi thêm ảnh nha.", "Bạn bán giá cuối bao nhiêu?", "Mình để giá là giá cuối rồi bạn ơi!", "Mình lấy nhé, khi nào giao dịch được?", "Cuối tuần bạn rảnh không? Mình hẹn gặp nha!"],
    ["Hàng này mua bao lâu rồi bạn?", "Khoảng 6 tháng bạn, dùng rất cẩn thận.", "OK bạn, có bớt được chút nào không?", "Bạn lấy bao nhiêu?", "Bớt 10% được không?", "Được rồi, deal nhé bạn!"],
    ["Sản phẩm còn bảo hành không bạn?", "Còn bảo hành 3 tháng nữa bạn nhé!", "Có ship được không?", "Ship toàn quốc qua GHTK nhé bạn.", "OK mình đặt nha!"],
    ["Cho mình hỏi giá cuối được không?", "Giá đăng là giá cuối rồi bạn, mình đã để rẻ lắm.", "Thôi vậy mình lấy, gặp ở đâu?", "Quận 1, TP.HCM bạn nhé, hẹn cuối tuần."],
    ["Bạn ơi, mình muốn hỏi về sản phẩm.", "Bạn hỏi chi tiết mình trả lời nè!", "Sản phẩm có lỗi gì không?", "Không có lỗi gì bạn, hoạt động tốt 100%.", "Mình qua xem trực tiếp được không?", "Được chứ, bạn qua quận 7 nhé!"],
    ["Hi bạn, sản phẩm này fake hay auth?", "Auth bạn nhé, mình có bill mua hàng.", "Cho mình xem bill được không?", "Mình gửi ảnh bill nè bạn xem nhé.", "Oke mình tin, deal nhé!", "Ok bạn, hẹn giao hàng nhé!"],
]

# ==============================================================================
# SEED FUNCTION
# ==============================================================================

def seed():
    settings = get_settings()
    engine = build_engine(settings.database_url)
    Base.metadata.create_all(engine)

    session = SessionFactory()
    try:
        # Check if data already exists
        existing = session.query(User).count()
        if existing >= 20:
            print(f"⚠️  Đã có {existing} users, bỏ qua seed.")
            return

        print("🌱 Bắt đầu tạo dữ liệu mẫu...")

        # --- Categories ---
        categories = []
        for name in CATEGORIES:
            cat = Category(name=name)
            session.add(cat)
            categories.append(cat)
        session.flush()
        print(f"  ✅ {len(categories)} danh mục")

        # --- Users ---
        pwd = hash_password("Password123!")
        users = []
        now = datetime.now(UTC)
        for idx, u in enumerate(USERS):
            created = now - timedelta(days=random.randint(10, 180), hours=random.randint(0, 23))
            user = User(
                email=u["email"],
                password_hash=pwd,
                role=u.get("role", UserRole.USER),
                status=UserStatus.ACTIVE,
                created_at=created,
                updated_at=created,
            )
            session.add(user)
            session.flush()
            profile = Profile(
                user_id=str(user.id),
                full_name=u["full_name"],
                bio=u.get("bio"),
                created_at=created,
                updated_at=created,
            )
            session.add(profile)
            users.append(user)
        session.flush()
        print(f"  ✅ {len(users)} người dùng (mật khẩu: Password123!)")

        # --- Listings ---
        listings = []
        used_products = list(PRODUCTS)
        random.shuffle(used_products)
        for idx, prod in enumerate(used_products):
            owner = users[idx % len(users)]
            title, desc, price, cond, cat_idx, city = prod
            created = owner.created_at + timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
            listing = Listing(
                owner_id=str(owner.id),
                category_id=str(categories[cat_idx].id),
                title=title,
                description=desc,
                price=Decimal(str(price)),
                condition=ItemCondition(cond),
                location_data={"city": city},
                image_urls=[],
                status=ListingStatus.AVAILABLE,
                created_at=created,
                updated_at=created,
            )
            session.add(listing)
            listings.append(listing)
        session.flush()
        print(f"  ✅ {len(listings)} tin đăng")

        # --- Favorites (random, ~100 favorites) ---
        fav_count = 0
        for user in users:
            fav_listings = random.sample(listings, k=random.randint(3, 8))
            for fl in fav_listings:
                if str(fl.owner_id) != str(user.id):
                    session.execute(
                        user_favorite_listing.insert().values(user_id=str(user.id), listing_id=str(fl.id))
                    )
                    fav_count += 1
        session.flush()
        print(f"  ✅ {fav_count} lượt yêu thích")

        # --- Offers (50 offers: mix of PENDING, ACCEPTED, DECLINED, CANCELLED) ---
        offers = []
        offer_sources = random.sample(listings, k=min(50, len(listings)))
        for listing in offer_sources:
            potential_buyers = [u for u in users if str(u.id) != str(listing.owner_id)]
            buyer = random.choice(potential_buyers)
            discount = random.uniform(0.7, 1.0)
            offer_price = Decimal(str(round(float(listing.price) * discount, -3)))
            created = listing.created_at + timedelta(hours=random.randint(2, 72))

            offer = Offer(
                listing_id=str(listing.id),
                buyer_id=str(buyer.id),
                price=offer_price,
                status=OfferStatus.PENDING,
                created_at=created,
                updated_at=created,
            )
            session.add(offer)
            offers.append(offer)
        session.flush()
        print(f"  ✅ {len(offers)} đề xuất giá")

        # --- Process offers: accept 15, decline 10, cancel 5 ---
        random.shuffle(offers)
        deals = []
        accepted_listing_ids = set()

        for offer in offers[:15]:
            if str(offer.listing_id) in accepted_listing_ids:
                continue
            offer.status = OfferStatus.ACCEPTED
            listing_obj = next(l for l in listings if str(l.id) == str(offer.listing_id))
            listing_obj.status = ListingStatus.RESERVED
            listing_obj.touch()
            deal = Deal(
                listing_id=str(offer.listing_id),
                buyer_id=str(offer.buyer_id),
                seller_id=str(listing_obj.owner_id),
                agreed_price=offer.price,
                status=DealStatus.OPEN,
                created_at=offer.created_at + timedelta(hours=random.randint(1, 24)),
                updated_at=offer.created_at + timedelta(hours=random.randint(1, 24)),
            )
            session.add(deal)
            deals.append((deal, listing_obj))
            accepted_listing_ids.add(str(offer.listing_id))

        for offer in offers[15:25]:
            if offer.status != OfferStatus.PENDING:
                continue
            offer.status = OfferStatus.DECLINED

        for offer in offers[25:30]:
            if offer.status != OfferStatus.PENDING:
                continue
            offer.status = OfferStatus.CANCELLED

        session.flush()
        print(f"  ✅ {len(deals)} thỏa thuận ({len([o for o in offers if o.status == OfferStatus.DECLINED])} từ chối, {len([o for o in offers if o.status == OfferStatus.CANCELLED])} hủy)")

        # --- Complete some deals (6), cancel some (2), keep rest OPEN ---
        for deal, listing_obj in deals[:6]:
            deal.status = DealStatus.COMPLETED
            listing_obj.status = ListingStatus.SOLD
            listing_obj.touch()

        for deal, listing_obj in deals[6:8]:
            deal.status = DealStatus.CANCELLED
            listing_obj.status = ListingStatus.AVAILABLE
            listing_obj.touch()

        session.flush()

        # --- Meetups for OPEN deals ---
        meetup_count = 0
        for deal, _ in deals[8:]:
            if deal.status != DealStatus.OPEN:
                continue
            meetup = Meetup(
                deal_id=str(deal.id),
                scheduled_at=datetime.now(UTC) + timedelta(days=random.randint(1, 14)),
                location={"address": random.choice([
                    "Quán Cà Phê Highlands, Quận 1, TP.HCM",
                    "Công viên Lê Văn Tám, Quận 3, TP.HCM",
                    "Bưu điện Hà Nội, Hoàn Kiếm",
                    "Vincom Center Đà Nẵng",
                    "FPT Shop Nguyễn Huệ, TP.HCM",
                ])},
                status=MeetupStatus.SCHEDULED,
                created_at=deal.created_at + timedelta(hours=random.randint(2, 12)),
                updated_at=deal.created_at + timedelta(hours=random.randint(2, 12)),
            )
            session.add(meetup)
            meetup_count += 1

        # Completed meetups for completed deals
        for deal, _ in deals[:6]:
            meetup = Meetup(
                deal_id=str(deal.id),
                scheduled_at=deal.created_at + timedelta(days=random.randint(1, 5)),
                location={"address": random.choice(["Quán Highland, Q1", "Bưu điện Hà Nội", "Vincom Đà Nẵng"])},
                status=MeetupStatus.COMPLETED,
                created_at=deal.created_at + timedelta(hours=1),
                updated_at=deal.created_at + timedelta(days=random.randint(1, 5)),
            )
            session.add(meetup)
            meetup_count += 1

        session.flush()
        print(f"  ✅ {meetup_count} lịch hẹn gặp")

        # --- Conversations & Messages ---
        conv_count = 0
        msg_count = 0
        used_pairs = set()

        for listing in random.sample(listings, k=min(25, len(listings))):
            potential_buyers = [u for u in users if str(u.id) != str(listing.owner_id)]
            buyer = random.choice(potential_buyers)
            pair = (str(buyer.id), str(listing.owner_id))
            if pair in used_pairs:
                continue
            used_pairs.add(pair)

            owner = next(u for u in users if str(u.id) == str(listing.owner_id))
            conv = Conversation(
                listing_id=str(listing.id),
                title=f"Hỏi về: {listing.title[:40]}",
                created_at=listing.created_at + timedelta(hours=random.randint(1, 48)),
                updated_at=listing.created_at + timedelta(hours=random.randint(1, 48)),
            )
            session.add(conv)
            session.flush()

            # Add participants
            session.execute(conversation_participant.insert().values(conversation_id=str(conv.id), user_id=str(buyer.id)))
            session.execute(conversation_participant.insert().values(conversation_id=str(conv.id), user_id=str(owner.id)))

            # Add messages
            snippet = random.choice(CHAT_MESSAGES)
            msg_time = conv.created_at
            for i, content in enumerate(snippet):
                sender = buyer if i % 2 == 0 else owner
                msg_time = msg_time + timedelta(minutes=random.randint(1, 30))
                msg = Message(
                    conversation_id=str(conv.id),
                    sender_id=str(sender.id),
                    content=content,
                    created_at=msg_time,
                    updated_at=msg_time,
                )
                session.add(msg)
                msg_count += 1

            conv_count += 1

        session.flush()
        print(f"  ✅ {conv_count} cuộc hội thoại, {msg_count} tin nhắn")

        # --- Reports ---
        report_count = 0
        report_listings = random.sample(listings, k=min(8, len(listings)))
        reasons = [
            "Giá quá cao so với thực tế, nghi ngờ lừa đảo.",
            "Ảnh sản phẩm không khớp với mô tả.",
            "Tin đăng trùng lặp nhiều lần.",
            "Nội dung không phù hợp, có dấu hiệu spam.",
            "Sản phẩm cấm kinh doanh theo quy định.",
            "Người bán giao hàng không đúng cam kết.",
            "Tài khoản giả mạo, thông tin không thật.",
            "Sản phẩm đã bán nhưng vẫn đăng bán.",
        ]
        for i, listing in enumerate(report_listings):
            reporter = random.choice([u for u in users if str(u.id) != str(listing.owner_id)])
            status = ReportStatus.PENDING if i < 4 else (ReportStatus.RESOLVED if i < 6 else ReportStatus.DISMISSED)
            report = Report(
                reporter_id=str(reporter.id),
                target_type=ReportTargetType.LISTING,
                target_id=listing.id,
                reason=reasons[i % len(reasons)],
                status=status,
                created_at=listing.created_at + timedelta(days=random.randint(1, 10)),
                updated_at=listing.created_at + timedelta(days=random.randint(1, 10)),
            )
            session.add(report)
            report_count += 1

        session.flush()
        print(f"  ✅ {report_count} báo cáo vi phạm")

        # --- Blocks (3 pairs) ---
        block_pairs = [(users[5], users[8]), (users[12], users[3]), (users[17], users[10])]
        for blocker, blocked in block_pairs:
            block = Block(
                blocker_id=str(blocker.id),
                blocked_id=str(blocked.id),
                created_at=now - timedelta(days=random.randint(1, 30)),
                updated_at=now - timedelta(days=random.randint(1, 30)),
            )
            session.add(block)
        session.flush()
        print(f"  ✅ {len(block_pairs)} lượt chặn")

        session.commit()
        print(f"\n🎉 Hoàn thành! Dữ liệu mẫu đã được tạo thành công.")
        print(f"   📧 Email mẫu: admin@marketplace.vn (hoặc bất kỳ email nào ở trên)")
        print(f"   🔑 Mật khẩu: Password123!")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Lỗi: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
