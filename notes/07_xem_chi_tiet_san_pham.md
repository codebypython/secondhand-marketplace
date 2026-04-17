# Xem Chi Tiết Sản Phẩm (Listing Detail)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Khách / Người dùng (Guest/User)**

## Tên cụ thể của chức năng
Xem chi tiết một sản phẩm (`GET /api/v1/listings/{listing_id}`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP GET request với `listing_id` (UUID) là path parameter.
- Không yêu cầu authentication — endpoint công khai.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Query listing:** `SELECT * FROM listings WHERE id = ? AND deleted_at IS NULL`.
2. **Eager load:** `selectinload(Listing.owner → User.profile)` + `selectinload(Listing.category)`.
3. **404 nếu không tìm thấy:** `get_listing_or_error()` raise ValueError → HTTPException 404.
4. **Trả về ListingRead:** Serialize với owner info (id, email, profile), category, image_urls, location_data, timestamps.

## Cách mà luồng Backend hoạt động
```
Client GET /listings/{listing_id}
  → FastAPI → get_listing_endpoint(listing_id: UUID)
    → get_listing_or_error(session, listing_id) [service]
      → select(Listing).options(eager loads).where(id == ?)
      → session.scalar(stmt) → Listing hoặc None
      → None → raise ValueError("Listing not found")
    → ListingRead serialize → HTTP 200 + JSON
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **RESTful resource:** `/listings/{id}` — chuẩn REST cho single resource.
- **HTTP GET** — idempotent, safe.
- **Nested JSON:** Response chứa nested objects: `owner.profile`, `category`.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Listing` model** — `is_available()`, `reserve()`, `mark_sold()`, `reopen()` — **Encapsulation** với state machine behavior.
- **`get_listing_or_error()`** — **Repository pattern** cho data access.
- **Nested serialization:** `ListingRead` chứa `UserRead` với `ProfileRead` — **Composite DTO**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Navigate `/listings/{id}` → `api.getListing(id)` GET request.
2. Hiển thị image gallery (chọn ảnh bằng thumbnails).
3. Hiển thị: trạng thái badge, tình trạng badge, giá, mô tả, vị trí, thời gian.
4. Seller card clickable → link `/users/{owner_id}`.
5. Load `api.getUserListings(owner_id)` → hiển thị sản phẩm liên quan từ cùng người bán.
6. Nút hành động: Yêu thích, Chia sẻ, Nhắn tin, Đề xuất giá.

## Lộ trình phát triển

### Giai đoạn 1 — Trải nghiệm Xem tốt hơn (Ngắn hạn)
- **Đếm lượt xem** (view count) — hiển thị "X lượt xem".
- Thêm **slideshow tự động** cho gallery ảnh.
- Hiển thị **ngày đăng + ngày cập nhật** rõ ràng.
- Thêm nút **"Sản phẩm tương tự"** gợi ý theo category + price range.
- Breadcrumb navigation: Home > Danh mục > Sản phẩm.

### Giai đoạn 2 — Tương tác Nâng cao (Trung hạn)
- Hệ thống **Q&A** (hỏi đáp công khai) trên trang sản phẩm.
- Hiển thị **lịch sử giá** (nếu seller thay đổi giá).
- **Bản đồ vị trí** tích hợp Google Maps / Mapbox cho location.
- **So sánh sản phẩm:** chọn 2-3 sản phẩm để so sánh side-by-side.
- **Chia sẻ xã hội:** Open Graph meta tags cho preview đẹp trên Facebook/Zalo.

### Giai đoạn 3 — Trust & Safety (Dài hạn)
- **Kiểm tra ảnh trùng lặp** (reverse image search) phát hiện lừa đảo.
- **Badge "Giá hợp lý"** — so sánh với giá thị trường trung bình.
- **Lịch sử sở hữu** (provenance) cho sản phẩm giá trị cao.
- Schema.org **structured data** cho Google Rich Snippets.
