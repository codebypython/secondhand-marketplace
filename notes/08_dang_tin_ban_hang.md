# Đăng Tin Bán Hàng (Create Listing)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Tạo tin đăng bán sản phẩm mới (`POST /api/v1/listings`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + `Authorization: Bearer <token>` + JSON body.
- Body: `title` (string, bắt buộc), `description` (string), `price` (decimal ≥ 0), `condition` (enum: NEW/LIKE_NEW/USED), `category_id` (UUID), `image_urls` (array string), `location_data` (JSON object).
- Schema: `ListingCreate(BaseModel)`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Xác thực:** `get_current_user()` → kiểm tra JWT + active status.
2. **Kiểm tra active:** `owner.ensure_active()` → raise nếu BANNED.
3. **Tạo Listing:** `INSERT INTO listings(owner_id, title, description, price, condition, category_id, image_urls, location_data, status='AVAILABLE')`.
4. **Commit + Reload:** `session.commit()` → `get_listing_or_error(session, listing.id)` để eager load owner + category.

## Cách mà luồng Backend hoạt động
```
Client POST /listings + Bearer token + JSON
  → FastAPI → create_listing_endpoint()
    → get_current_user() → authenticate
    → create_listing(session, user, payload) [service]
      → user.ensure_active()
      → Listing(owner_id=user.id, **payload.model_dump())
      → session.add(listing) → session.commit()
      → get_listing_or_error() → eager load relations
    → HTTP 201 + JSON ListingRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP POST** — tạo resource mới, trả về 201 Created.
- **Authentication required:** Bearer token trong header.
- **JSON payload** chứa nhiều kiểu dữ liệu: string, decimal, enum, array, nested object.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Listing` model** kế thừa 4 mixins (UUIDMixin, TimestampMixin, SoftDeleteMixin, Base) — **Multiple Inheritance**.
- **`ListingCreate` DTO** — tách biệt input schema khỏi ORM model.
- **`ensure_active()`** — Permission check encapsulated trong model.
- **`CheckConstraint("price >= 0")`** — Database-level validation + model-level validation = **Defense in Depth**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang `/listings/new` hiển thị form: tiêu đề, mô tả, giá, tình trạng (dropdown), danh mục (dropdown), URL ảnh, vị trí.
2. Submit → `api.createListing(token, payload)` → POST.
3. Thành công → Toast xanh "Đã đăng tin!" → redirect tới `/listings/{new_id}`.
4. Lỗi → Toast đỏ hiển thị message.
5. Danh mục được load từ `api.listCategories()` khi trang mount.

## Lộ trình phát triển

### Giai đoạn 1 — Upload Ảnh thực & Form UX (Ngắn hạn)
- **File upload** thay vì nhập URL: drag & drop, multi-select, preview thumbnails.
- Tích hợp **cloud storage** (S3/Cloudinary) cho lưu trữ ảnh.
- **Form validation** chi tiết: tiêu đề tối thiểu 10 ký tự, mô tả tối thiểu 30 ký tự.
- **Auto-save draft** — lưu nháp tự động vào localStorage.
- Thêm **gợi ý giá** dựa trên sản phẩm tương tự trong hệ thống.

### Giai đoạn 2 — Đăng tin Nâng cao (Trung hạn)
- Thêm fields: **thương hiệu**, **năm sản xuất**, **bảo hành**, **lý do bán**.
- **Location picker** trên bản đồ (chọn điểm giao dịch).
- **Đăng tin hàng loạt** — upload CSV/Excel cho nhiều sản phẩm.
- Hệ thống **duyệt tin** (Admin phải approve trước khi public).
- Hỗ trợ **video sản phẩm** (embed YouTube hoặc upload).

### Giai đoạn 3 — AI & Tự động hoá (Dài hạn)
- **AI auto-categorize:** tự phân loại sản phẩm từ ảnh + tiêu đề (image recognition).
- **AI price suggestion:** gợi ý giá dựa trên ML model.
- **Auto-generate description:** tạo mô tả từ ảnh bằng AI.
- **Listing templates:** mẫu tin đăng cho từng loại sản phẩm.
- **Promotion/Boost:** trả phí đẩy tin lên đầu (monetization).
