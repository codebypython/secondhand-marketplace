# Duyệt Danh Sách Sản Phẩm (List Listings)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Khách / Người dùng (Guest/User)**

## Tên cụ thể của chức năng
Xem danh sách tất cả sản phẩm đang bán + tìm kiếm (`GET /api/v1/listings`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP GET request với query parameters tùy chọn:
  - `search` (string) — tìm kiếm theo tên sản phẩm (ILIKE).
  - `category_id` (UUID) — lọc theo danh mục.
  - `condition` (enum: NEW, LIKE_NEW, USED) — lọc theo tình trạng.
  - `status` (enum: AVAILABLE, RESERVED, SOLD, HIDDEN) — lọc theo trạng thái.
  - `owner_id` (UUID) — lọc theo người đăng.
- Không yêu cầu authentication.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Base query:** `SELECT * FROM listings WHERE deleted_at IS NULL` (soft delete filter).
2. **Dynamic filters:** Thêm WHERE clause cho mỗi query param có giá trị:
   - `search → WHERE title ILIKE '%search%'`
   - `category_id → WHERE category_id = ?`
   - `condition → WHERE condition = ?`
   - `status → WHERE status = ?`
   - `owner_id → WHERE owner_id = ?`
3. **Eager load:** `selectinload(Listing.owner → User.profile)` + `selectinload(Listing.category)`.
4. **Sort:** `ORDER BY created_at DESC` — mới nhất trước.
5. **Unique:** `.unique()` để tránh duplicate khi eager loading.

## Cách mà luồng Backend hoạt động
```
Client GET /listings?search=iphone&category_id=...
  → FastAPI → list_listings_endpoint() 
    → Query params parsed tự động bởi FastAPI
    → list_listings(session, search, category_id, ...) [service]
      → select(Listing).options(eager loads)
      → Thêm WHERE clause cho mỗi filter
      → order_by(created_at DESC)
      → session.scalars(stmt).unique()
    → list[ListingRead] → HTTP 200 + JSON array
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **Query String Parameters:** `?search=...&category_id=...` — chuẩn HTTP GET filtering.
- **URL encoding:** FastAPI tự handle URL decode cho Unicode characters.
- **JSON array response:** Trả về list JSON objects.
- **Debounce trên client:** Frontend delay 300ms trước khi gửi search request → giảm tải network.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Dynamic Query Builder:** Thêm WHERE clause dựa trên input — **Builder pattern**.
- **`Listing` model** có relationship: `owner (User)`, `category (Category)`, `offers`, `deals`, `liked_by` — **Association pattern** (nhiều quan hệ).
- **`ListingRead` schema** flatten nested objects — **DTO pattern** cho API response.
- **`selectinload()`** — **Strategy pattern** cho loading strategy (SELECT IN vs JOIN).

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang chủ `/` mount → `api.listListings()` GET request.
2. User gõ vào search box → debounce 300ms → `api.listListings(new URLSearchParams({search}))`.
3. Response trả về array listings → React state update → re-render grid cards.
4. Mỗi card hiển thị: ảnh/placeholder, title, giá (formatPrice), trạng thái badge, tình trạng badge, seller avatar + tên, thời gian tương đối (timeAgo).
5. Loading state → hiển thị 6 skeleton cards.
6. Không có kết quả → empty state "Chưa có tin đăng nào".
7. Stats dashboard hiển thị: số đang bán, đã bán, tổng tin.

## Lộ trình phát triển

### Giai đoạn 1 — Cải thiện Tìm kiếm & Lọc (Ngắn hạn)
- **Phân trang (pagination):** infinite scroll hoặc load more button (hiện tải hết).
- Thêm bộ lọc **khoảng giá** (min-max slider).
- **Sắp xếp** theo: mới nhất, giá tăng/giảm, phổ biến nhất.
- Thêm lọc theo **vị trí/khu vực** (tỉnh/thành phố).
- Hiển thị **số kết quả** và **ảnh thumbnail** cho mỗi card.

### Giai đoạn 2 — Full-text Search & Caching (Trung hạn)
- Tích hợp **full-text search** (PostgreSQL tsvector hoặc Elasticsearch).
- **Search suggestions / autocomplete** khi gõ.
- **Redis cache** cho kết quả tìm kiếm phổ biến (giảm tải DB).
- Hỗ trợ **multi-filter**: kết hợp nhiều danh mục, tình trạng, khu vực.
- Thêm **view mode**: grid / list toggle.

### Giai đoạn 3 — Gợi ý Thông minh (Dài hạn)
- **Recommendation engine:** gợi ý sản phẩm dựa trên lịch sử xem + yêu thích.
- **Trending / Hot deals:** sản phẩm nhiều lượt xem, yêu thích trong 24h.
- **Geolocation search:** sắp xếp theo khoảng cách địa lý (Maps API).
- **Map view:** hiển thị sản phẩm trên bản đồ.
- SEO: trang listing có meta tags, structured data (Schema.org Product).
