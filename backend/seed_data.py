"""
Seed script – tạo dữ liệu mẫu sạch cho các tài khoản thật và các tin đăng mẫu kèm hình ảnh sản phẩm.

Chạy:  python seed_data.py
"""

import random
import sys
import uuid
import os
import urllib.request
import math
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
    NotificationType,
)
from app.models.transaction import Deal, Meetup, Offer  # noqa: E402
from app.models.chat import Conversation, Message  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.moderation import Block, Report  # noqa: E402
from app.models.map_legend import MapLegend  # noqa: E402
from app.models.associations import user_favorite_listing, conversation_participant  # noqa: E402
from sqlalchemy import select

# ==============================================================================
# 1. USER DATA (REAL GMAIL ACCOUNTS)
# ==============================================================================
USERS = [
    {"email": "kien1152005@gmail.com", "full_name": "Nguyễn Trung Kiên (Admin)", "bio": "Quản trị viên hệ thống Marketplace. Hỗ trợ người dùng 24/7.", "role": UserRole.ADMIN},
    {"email": "namhai13245768@gmail.com", "full_name": "Nam Hải", "bio": "Thành viên uy tín chuyên mua bán điện thoại, laptop cũ tại Hà Nội."},
    {"email": "kienkaiser102@gmail.com", "full_name": "Kiên Kaiser", "bio": "Đam mê nhiếp ảnh và đồ công nghệ vintage. Ship toàn quốc."},
    {"email": "nguyenkientrung252@gmail.com", "full_name": "Nguyễn Kiên Trung", "bio": "Sinh viên đam mê đọc sách, đồ gia dụng thông minh và thời trang."},
]

# ==============================================================================
# 2. CATEGORY DATA
# ==============================================================================
CATEGORIES_STRUCTURE = {
    "Điện tử": [
        ("Điện thoại", "dien-thoai"),
        ("Laptop", "laptop"),
        ("Máy tính bảng", "may-tinh-bang"),
        ("Phụ kiện công nghệ", "phu-kien-cong-nghe")
    ],
    "Thời trang": [
        ("Quần áo", "quan-ao"),
        ("Giày dép", "giay-dep"),
        ("Túi xách", "tui-xach"),
        ("Đồng hồ & Phụ kiện", "dong-ho-phu-kien")
    ],
    "Đồ gia dụng": [
        ("Dụng cụ nhà bếp", "dung-cu-nha-bep"),
        ("Thiết bị gia đình", "thiet-bi-gia-dinh"),
        ("Dọn dẹp & Vệ sinh", "don-dep-ve-sinh")
    ],
    "Sách & Học liệu": [
        ("Sách giáo khoa", "sach-giao-khoa"),
        ("Sách ngoại ngữ", "sach-ngoai-ngu"),
        ("Truyện tranh", "truyen-tranh"),
        ("Tài liệu học tập", "tai-lieu-hoc-tap")
    ],
    "Xe cộ & Phụ kiện": [
        ("Xe máy", "xe-may"),
        ("Xe đạp", "xe-dap"),
        ("Phụ tùng xe", "phu-tung-xe"),
        ("Đồ bảo hộ", "do-bao-ho")
    ],
    "Đồ trẻ em": [
        ("Đồ chơi", "do-choi"),
        ("Quần áo trẻ em", "quan-ao-tre-em"),
        ("Xe đẩy & Cũi", "xe-day-cui"),
        ("Sữa & Tã bỉm", "sua-ta-bim")
    ],
    "Thể thao": [
        ("Dụng cụ tập gym", "dung-cu-tap-gym"),
        ("Vợt & Bóng", "vot-bong"),
        ("Giày thể thao", "giay-the-thao"),
        ("Trang phục thể thao", "trang-phuc-the-thao")
    ],
    "Nhiếp ảnh": [
        ("Máy ảnh", "may-anh"),
        ("Ống kính", "ong-kinh"),
        ("Chân máy & Gậy", "chan-may-gay"),
        ("Đèn & Phụ kiện studio", "den-phu-kien-studio")
    ],
    "Gaming": [
        ("Máy chơi game", "may-choi-game"),
        ("Đĩa game & Thẻ", "dia-game-the"),
        ("Phụ kiện gaming", "phu-kien-gaming")
    ],
    "Nội thất": [
        ("Bàn & Ghế", "ban-ghe"),
        ("Giường & Tủ", "giuong-tu"),
        ("Trang trí nhà cửa", "trang-tri-nha-cua")
    ]
}

# ==============================================================================
# 3. LISTINGS DATA
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
]

# Unsplash sample images for each category to look professional and authentic
MOCK_IMAGE_POOLS = {
    "Điện tử": [
        "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80"
    ],
    "Thời trang": [
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"
    ],
    "Đồ gia dụng": [
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80"
    ],
    "Sách & Học liệu": [
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80"
    ],
    "Xe cộ & Phụ kiện": [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80"
    ],
    "Đồ trẻ em": [
        "https://images.unsplash.com/photo-1515488042361-404e9250afef?auto=format&fit=crop&w=600&q=80"
    ],
    "Thể thao": [
        "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80"
    ],
    "Nhiếp ảnh": [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80"
    ],
    "Gaming": [
        "https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?auto=format&fit=crop&w=600&q=80"
    ],
    "Nội thất": [
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80"
    ]
}

CHAT_MESSAGES = [
    ["Chào bạn, sản phẩm này còn không ạ?", "Dạ còn bạn nhé! Bạn quan tâm để mình gửi thêm ảnh nha.", "Bạn bán giá cuối bao nhiêu?", "Mình để giá là giá cuối rồi bạn ơi!", "Mình lấy nhé, khi nào giao dịch được?", "Cuối tuần bạn rảnh không? Mình hẹn gặp nha!"],
    ["Hàng này mua bao lâu rồi bạn?", "Khoảng 6 tháng bạn, dùng rất cẩn thận.", "OK bạn, có bớt được chút nào không?", "Bạn lấy bao nhiêu?", "Bớt 10% được không?", "Được rồi, deal nhé bạn!"],
    ["Sản phẩm còn bảo hành không bạn?", "Còn bảo hành 3 tháng nữa bạn nhé!", "Có ship được không?", "Ship toàn quốc qua GHTK nhé bạn.", "OK mình đặt nha!"],
]

def download_image(url: str, filename: str) -> str:
    try:
        os.makedirs("static/uploads", exist_ok=True)
        path = os.path.join("static/uploads", filename)
        
        # Prevent downloading if it already exists to save time
        if os.path.exists(path) and os.path.getsize(path) > 1024:
            return f"/static/uploads/{filename}"
            
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response, open(path, 'wb') as out_file:
            out_file.write(response.read())
        return f"/static/uploads/{filename}"
    except Exception as e:
        print(f"      [WARNING] Error downloading image {url}: {e}")
        # Return fallback remote URL directly
        return url

def seed():
    settings = get_settings()
    engine = build_engine(settings.database_url)
    
    print("[DB RESET] Cleaning up and resetting database...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("[DB RESET] Database schema is clean!")

    session = SessionFactory()
    try:
        print("[SEED] Starting database seed...")

        # --- Map Legends ---
        print("  [SEED] Initializing map legends...")
        default_legends = [
            {"symbol_type": "STANDARD", "icon": "📍", "name": "Điểm hẹn thường", "description": "Địa điểm giao dịch mặc định theo thỏa thuận giữa hai bên.", "color": "#6366f1"},
            {"symbol_type": "SAFE_ZONE", "icon": "👮", "name": "Khu vực an toàn", "description": "Gần đồn cảnh sát hoặc văn phòng chính quyền công cộng. Rất an toàn, khuyên dùng cho các giao dịch giá trị cao.", "color": "#10b981"},
            {"symbol_type": "COFFEE", "icon": "☕", "name": "Quán cà phê", "description": "Thích hợp để ngồi test thử sản phẩm điện tử, trao đổi thoải mái.", "color": "#f59e0b"},
            {"symbol_type": "STORE", "icon": "🏪", "name": "Cửa hàng tiện lợi", "description": "Khu vực sáng sủa, có camera an ninh, mở cửa 24/7 và đông người qua lại.", "color": "#3b82f6"},
            {"symbol_type": "HOME", "icon": "🏠", "name": "Nhà riêng", "description": "Địa chỉ nhà của người mua hoặc người bán. Nên cân nhắc trước khi chia sẻ.", "color": "#8b5cf6"},
            {"symbol_type": "PARK", "icon": "🌳", "name": "Công viên", "description": "Khu vực ngoài trời thoáng mát, thích hợp hẹn gặp ban ngày.", "color": "#ec4899"},
        ]
        for leg in default_legends:
            legend_obj = MapLegend(**leg)
            session.add(legend_obj)
        session.flush()

        # --- Categories ---
        parent_categories = []
        child_categories_map = {} # parent_id -> list of child categories
        total_cats_count = 0
        
        for parent_name, children_list in CATEGORIES_STRUCTURE.items():
            parent_slug = parent_name.lower().replace(" ", "-").replace("&", "and").replace("đ", "d").replace("Đ", "d")
            parent_cat = Category(name=parent_name, slug=parent_slug)
            session.add(parent_cat)
            session.flush()
            parent_categories.append(parent_cat)
            child_categories_map[parent_cat.id] = []
            total_cats_count += 1
            
            for child_name, child_slug in children_list:
                child_cat = Category(name=child_name, slug=child_slug, parent_id=parent_cat.id)
                session.add(child_cat)
                session.flush()
                child_categories_map[parent_cat.id].append(child_cat)
                total_cats_count += 1
                
        print(f"  [SUCCESS] Created {total_cats_count} categories (including subcategories).")

        # --- Download High Quality Images ---
        print("  [SEED] Downloading mock images...")
        local_images = {}
        for cat_name, urls in MOCK_IMAGE_POOLS.items():
            local_images[cat_name] = []
            for idx, url in enumerate(urls):
                clean_cat_name = cat_name.lower().replace(" ", "_").replace("&", "and")
                filename = f"seed_{clean_cat_name}_{idx + 1}.jpg"
                local_url = download_image(url, filename)
                local_images[cat_name].append(local_url)
        print("  [SUCCESS] Mock images ready.")

        # --- Users & Live Rooms ---
        LIVE_ROOM_SEEDS = {
            "namhai13245768@gmail.com": {
                "title": "Nam Hải Mobile & Laptop - Xả kho Điện thoại, Laptop cũ giá cực tốt",
                "preview_url": "https://images.unsplash.com/photo-1588702547884-7803aba28626?auto=format&fit=crop&w=600&q=80",
                "tags": "Điện tử,Laptop,Điện thoại"
            },
            "kienkaiser102@gmail.com": {
                "title": "Kiên Kaiser Vintage - Máy ảnh & Ống kính cổ điển chất lượng",
                "preview_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
                "tags": "Nhiếp ảnh,Máy ảnh"
            },
            "nguyenkientrung252@gmail.com": {
                "title": "Góc Sách & Đồ Gia Dụng Thanh Lý Học Sinh Sinh Viên",
                "preview_url": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
                "tags": "Sách,Thời trang,Gia dụng"
            },
            "kien1152005@gmail.com": {
                "title": "Phòng live hỗ trợ kiểm duyệt tin đăng và giải đáp thắc mắc",
                "preview_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
                "tags": "Kiểm duyệt,Hỗ trợ"
            }
        }

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

            from app.models.livestream import LiveRoom
            room_seed = LIVE_ROOM_SEEDS.get(u["email"], {
                "title": f"Phòng livestream của {u['full_name']}",
                "preview_url": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
                "tags": "Chợ Đồ Cũ"
            })
            live_room = LiveRoom(
                user_id=str(user.id),
                title=room_seed["title"],
                preview_url=room_seed["preview_url"],
                tags=room_seed["tags"],
                is_live=False,
                is_online=False,
                created_at=created,
                updated_at=created
            )
            session.add(live_room)
            users.append(user)
        session.flush()
        print(f"  [SUCCESS] Created {len(users)} real users & live rooms (Default password: Password123!)")

        # --- Listings ---
        listings = []
        used_products = list(PRODUCTS)
        random.shuffle(used_products)

        # Center coordinates for DUT (Danang University of Technology)
        DUT_LAT = 16.0748
        DUT_LNG = 108.1532

        danang_streets = [
            "Nguyễn Lương Bằng, Liên Chiểu",
            "Tôn Đức Thắng, Liên Chiểu",
            "Phạm Như Xương, Liên Chiểu",
            "Ngô Thì Nhậm, Liên Chiểu",
            "Âu Cơ, Liên Chiểu",
            "Điện Biên Phủ, Thanh Khê",
            "Nguyễn Văn Linh, Hải Châu",
            "Lê Duẩn, Hải Châu",
            "Trần Hưng Đạo, Sơn Trà",
            "Nguyễn Hữu Thọ, Cẩm Lệ",
            "Võ Nguyên Giáp, Ngũ Hành Sơn"
        ]

        def get_danang_coords_and_address(idx):
            # Distribute radius: 50% chance between 1-5km (close), 50% between 5-20km
            if random.random() < 0.5:
                radius = random.uniform(1.0, 5.0)
            else:
                radius = random.uniform(5.0, 20.0)

            bearing = random.uniform(0, 2 * math.pi)
            R = 6371.0
            ad = radius / R

            lat_rad = math.asin(math.sin(math.radians(DUT_LAT)) * math.cos(ad) +
                                math.cos(math.radians(DUT_LAT)) * math.sin(ad) * math.cos(bearing))
            lng_rad = math.radians(DUT_LNG) + math.atan2(math.sin(bearing) * math.sin(ad) * math.cos(math.radians(DUT_LAT)),
                                                         math.cos(ad) - math.sin(math.radians(DUT_LAT)) * math.sin(lat_rad))

            lat = math.degrees(lat_rad)
            lng = math.degrees(lng_rad)

            street = random.choice(danang_streets)
            address = f"Số {random.randint(1, 350)} đường {street}, TP. Đà Nẵng"

            return lat, lng, address

        for idx, prod in enumerate(used_products):
            owner = users[idx % len(users)]
            title, desc, price, cond, cat_idx, city = prod
            created = owner.created_at + timedelta(days=random.randint(1, 15), hours=random.randint(0, 12))
            
            # Match listing to pre-downloaded images
            parent_cat = parent_categories[cat_idx]
            cat_name = parent_cat.name
            pool = local_images.get(cat_name, [])
            image_urls = [random.choice(pool)] if pool else []

            # Generate random coords and address within 1-20km of DUT
            lat, lng, address = get_danang_coords_and_address(idx)
            
            chosen_cat = random.choice(child_categories_map[parent_cat.id])
            
            listing = Listing(
                owner_id=str(owner.id),
                category_id=str(chosen_cat.id),
                title=title,
                description=desc,
                price=Decimal(str(price)),
                condition=ItemCondition(cond),
                location_data={
                    "city": "Đà Nẵng",
                    "district": "Liên Chiểu",
                    "address": address,
                    "lat": lat,
                    "lng": lng,
                    "symbol_type": "STANDARD"
                },
                image_urls=image_urls,
                status=ListingStatus.AVAILABLE,
                created_at=created,
                updated_at=created,
            )
            session.add(listing)
            listings.append(listing)
        session.flush()
        print(f"  [SUCCESS] Created {len(listings)} listings.")

        # --- Favorites ---
        fav_count = 0
        for user in users:
            fav_listings = random.sample(listings, k=random.randint(2, 5))
            for fl in fav_listings:
                if str(fl.owner_id) != str(user.id):
                    session.execute(
                        user_favorite_listing.insert().values(user_id=str(user.id), listing_id=str(fl.id))
                    )
                    fav_count += 1
        session.flush()
        print(f"  [SUCCESS] Created {fav_count} user favorites.")

        # --- Offers & Deals ---
        offers = []
        offer_sources = random.sample(listings, k=min(15, len(listings)))
        for listing in offer_sources:
            potential_buyers = [u for u in users if str(u.id) != str(listing.owner_id)]
            buyer = random.choice(potential_buyers)
            discount = random.uniform(0.85, 0.98)
            offer_price = Decimal(str(round(float(listing.price) * discount, -3)))
            created = listing.created_at + timedelta(hours=random.randint(2, 24))

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

        # Accept 5 offers to create deals
        random.shuffle(offers)
        deals = []
        accepted_listing_ids = set()
        for offer in offers[:5]:
            offer.status = OfferStatus.ACCEPTED
            listing_obj = next(l for l in listings if str(l.id) == str(offer.listing_id))
            listing_obj.touch()
            
            # Set to reserved
            listing_obj.status = ListingStatus.RESERVED
            
            deal = Deal(
                listing_id=str(offer.listing_id),
                buyer_id=str(offer.buyer_id),
                seller_id=str(listing_obj.owner_id),
                agreed_price=offer.price,
                status=DealStatus.OPEN,
                created_at=offer.created_at + timedelta(hours=random.randint(1, 6)),
                updated_at=offer.created_at + timedelta(hours=random.randint(1, 6)),
            )
            session.add(deal)
            deals.append((deal, listing_obj))
            accepted_listing_ids.add(str(offer.listing_id))
        session.flush()
        print(f"  [SUCCESS] Accepted {len(deals)} offers and created deals.")

        # Complete 2 deals
        for deal, listing_obj in deals[:2]:
            deal.status = DealStatus.COMPLETED
            listing_obj.status = ListingStatus.SOLD
            listing_obj.touch()
            
            meetup = Meetup(
                deal_id=str(deal.id),
                scheduled_at=deal.created_at + timedelta(days=1),
                location={"address": "Cổng chính Trường Đại học Bách khoa, 54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng"},
                status=MeetupStatus.COMPLETED,
                created_at=deal.created_at,
                updated_at=deal.created_at + timedelta(days=1),
            )
            session.add(meetup)
        session.flush()

        # Scheduled meetups for open deals
        meetup_count = 0
        for deal, _ in deals[2:]:
            meetup = Meetup(
                deal_id=str(deal.id),
                scheduled_at=datetime.now(UTC) + timedelta(days=random.randint(1, 7)),
                location={"address": "Highlands Coffee, 601 Tôn Đức Thắng, Hòa Khánh Nam, Liên Chiểu, Đà Nẵng"},
                status=MeetupStatus.SCHEDULED,
                created_at=deal.created_at + timedelta(hours=2),
                updated_at=deal.created_at + timedelta(hours=2),
            )
            session.add(meetup)
            meetup_count += 1
        session.flush()
        print(f"  [SUCCESS] Scheduled {meetup_count} meetups.")

        # --- Conversations & Messages ---
        conv_count = 0
        msg_count = 0
        used_pairs = set()

        for listing in random.sample(listings, k=min(10, len(listings))):
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
                created_at=listing.created_at + timedelta(hours=random.randint(1, 24)),
                updated_at=listing.created_at + timedelta(hours=random.randint(1, 24)),
            )
            session.add(conv)
            session.flush()

            # Add participants
            session.execute(conversation_participant.insert().values(conversation_id=str(conv.id), user_id=str(buyer.id)))
            session.execute(conversation_participant.insert().values(conversation_id=str(conv.id), user_id=str(owner.id)))

            # Add chat history
            snippet = random.choice(CHAT_MESSAGES)
            msg_time = conv.created_at
            for idx_m, content in enumerate(snippet):
                sender = buyer if idx_m % 2 == 0 else owner
                msg_time = msg_time + timedelta(minutes=random.randint(2, 15))
                
                # Determine status: last message is sent, second to last is delivered, rest is read
                if idx_m == len(snippet) - 1:
                    msg_status = "sent"
                elif idx_m == len(snippet) - 2:
                    msg_status = "delivered"
                else:
                    msg_status = "read"
                
                msg = Message(
                    conversation_id=str(conv.id),
                    sender_id=str(sender.id),
                    content=content,
                    status=msg_status,
                    created_at=msg_time,
                    updated_at=msg_time,
                )
                session.add(msg)
                msg_count += 1
            conv_count += 1

        session.flush()
        print(f"  [SUCCESS] Created {conv_count} conversations & {msg_count} messages.")

        # --- Reports ---
        reporter = users[3]
        listing_to_report = listings[5]
        report = Report(
            reporter_id=str(reporter.id),
            target_type=ReportTargetType.LISTING,
            target_id=listing_to_report.id,
            reason="Hình ảnh sản phẩm dường như được sao chép, không khớp với mô tả.",
            status=ReportStatus.PENDING,
            created_at=listing_to_report.created_at + timedelta(days=2),
            updated_at=listing_to_report.created_at + timedelta(days=2),
        )
        session.add(report)
        session.flush()
        print("  [SUCCESS] Created 1 sample report.")

        # --- Notifications ---
        print("  [SEED] Seeding unread notifications...")
        for u in users:
            notif1 = Notification(
                recipient_id=str(u.id),
                type=NotificationType.SYSTEM,
                title="Tài khoản hoạt động",
                message="Chào mừng bạn đến với Chợ Đồ Cũ! Tài khoản của bạn đã được kích hoạt thành công.",
                link="/profile",
                is_read=False,
                created_at=datetime.now(UTC) - timedelta(hours=3)
            )
            notif2 = Notification(
                recipient_id=str(u.id),
                type=NotificationType.OFFER_RECEIVED,
                title="Sản phẩm được yêu thích",
                message="Có người dùng vừa thích tin đăng của bạn! Hãy kiểm tra ngay.",
                link="/profile",
                is_read=False,
                created_at=datetime.now(UTC) - timedelta(hours=1)
            )
            session.add(notif1)
            session.add(notif2)
        session.flush()
        print("  [SUCCESS] Seeded unread notifications.")

        session.commit()
        print(f"\n[SUCCESS] Seeding completed successfully.")
        print("   Accounts available:")
        for u in USERS:
            print(f"   - {u['email']} (Password: Password123!)")

    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed()
