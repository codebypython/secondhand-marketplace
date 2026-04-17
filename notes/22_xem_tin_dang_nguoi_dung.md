# Xem Tin Đăng Của Người Dùng (User Listings)

## Nhóm chức năng
Mạng xã hội (Social) — Vai trò: **Khách / Người dùng (Guest/User)**

## Tên cụ thể của chức năng
Xem tất cả tin đăng của một người dùng (`GET /api/v1/users/{user_id}/listings`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP GET với path parameter `user_id` (UUID).
- Không yêu cầu authentication — endpoint công khai.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Query listings:** `SELECT * FROM listings WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`.
2. **Eager load:** `selectinload(Listing.owner → User.profile)` + `selectinload(Listing.category)`.
3. **Unique:** `.unique()` để tránh duplicate từ eager loading.
4. **Trả về tất cả listings:** Không phân trang — trả về toàn bộ listings của user.

## Cách mà luồng Backend hoạt động
```
GET /users/{user_id}/listings
  → FastAPI → get_user_listings(user_id: UUID)
    → select(Listing)
      .options(selectinload(Listing.owner).selectinload(User.profile), selectinload(Listing.category))
      .where(owner_id == ?)
      .order_by(created_at DESC)
    → session.scalars(stmt).unique()
    → list[ListingRead] → HTTP 200 + JSON array
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **RESTful nested resource:** `/users/{id}/listings` — sub-resource pattern.
- **HTTP GET** — safe, idempotent, cacheable.
- **No auth required** — public endpoint cho social profile viewing.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Nested resource URL** — **REST sub-resource** design pattern.
- **`selectinload` chain:** `Listing.owner → User.profile` — **Object Graph eager loading**.
- **Soft delete filter** tự động qua event listener — **AOP (Aspect-Oriented Programming)**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. **Public profile page** `/users/[userId]` → gọi `api.getUserListings(userId)` song song với `api.getUser(userId)`.
2. Hiển thị grid 2 cột: mỗi listing card có status badge, condition badge, title, description, giá, relative time.
3. Click card → navigate tới `/listings/{listing_id}`.
4. **Profile page** `/profile` → gọi `api.getUserListings(user.id)` để hiển thị "Sản phẩm của tôi" bên phải.
5. Stats trong profile card: số đang bán / đã bán.

## Lộ trình phát triển

### Giai đoạn 1 — Filter & Pagination (Ngắn hạn)
- **Phân trang:** hiển thị 12 sản phẩm/trang với pagination controls.
- **Filter theo status:** tabs "Đang bán" / "Đã bán" / "Tất cả".
- **Sort:** theo giá, ngày đăng, số lượt yêu thích.
- Hiển thị **ảnh thumbnail** cho mỗi listing card.

### Giai đoạn 2 — Social & Discovery (Trung hạn)
- **"Shop" page:** trang bán hàng riêng cho mỗi seller — custom URL `/shop/{username}`.
- **Banner + mô tả shop:** seller tùy chỉnh trang giới thiệu.
- **Voucher/Giảm giá:** seller tạo mã giảm giá cho sản phẩm.
- **Listing analytics cho seller:** lượt xem, yêu thích, tỷ lệ chuyển đổi từng sản phẩm.

### Giai đoạn 3 — SEO & Monetization (Dài hạn)
- **SEO-friendly URLs:** `/u/nguyenvana/san-pham` thay vì UUID.
- **Product catalog export:** xuất danh sách sản phẩm ra CSV/PDF.
- **Featured listings:** trả phí để pin sản phẩm lên đầu trang shop.
- **API public:** cho phép embed listings lên website khác (widget).
