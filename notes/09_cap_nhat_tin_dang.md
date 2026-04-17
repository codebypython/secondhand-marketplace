# Cập Nhật Tin Đăng (Update Listing)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Người dùng (User)** — chỉ chủ sở hữu

## Tên cụ thể của chức năng
Chỉnh sửa thông tin tin đăng (`PATCH /api/v1/listings/{listing_id}`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP PATCH + Bearer token + JSON body (partial update).
- Path param: `listing_id` (UUID).
- Body (tùy chọn): `title`, `description`, `price`, `condition`, `category_id`, `image_urls`, `location_data`, `status`.
- Schema: `ListingUpdate(BaseModel)` — tất cả fields Optional.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Load listing:** `get_listing_or_error()` → eager load relations.
2. **Authorization:** `listing.owner_id != actor.id` → raise "Only the owner can update".
3. **Partial update:** `payload.model_dump(exclude_unset=True)` → chỉ fields được gửi.
4. **Touch timestamp:** `listing.touch()` → cập nhật `updated_at`.
5. **Commit + Reload:** Trả về listing đã cập nhật.

## Cách mà luồng Backend hoạt động
```
Client PATCH /listings/{id} + Bearer + JSON
  → get_current_user() → authenticate
  → update_listing(session, user, listing_id, payload)
    → get_listing_or_error() → load listing
    → check owner_id == actor.id → authorization
    → setattr loop → partial update fields
    → listing.touch() → updated_at = now
    → session.commit() → reload
  → HTTP 200 + JSON ListingRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP PATCH** — partial update (khác PUT là full replace).
- **Idempotent:** Gửi cùng request nhiều lần cho cùng kết quả.
- **Authorization check:** Owner-only — server kiểm tra ownership.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`touch()` method** từ `TimestampMixin` — thể hiện **Template Method** pattern.
- **Owner authorization check** — **Access Control** pattern tại service layer.
- **Partial update via DTO** — **Command pattern** cho mutation.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Chủ tin đăng click "Chỉnh sửa" → form pre-filled với dữ liệu hiện tại.
2. Thay đổi fields → submit → `api.updateListing(token, listing_id, data)`.
3. Response → re-render trang chi tiết với dữ liệu mới.

## Lộ trình phát triển

### Giai đoạn 1 — Quản lý ảnh & Lịch sử (Ngắn hạn)
- Cho phép **thêm/xóa/sắp xếp ảnh** khi cập nhật (drag & drop reorder).
- Giữ **lịch sử thay đổi** (audit log): field nào, giá trị cũ → mới, thời gian.
- Thêm nút **"Đẩy tin"** — cập nhật `updated_at` để tin lên đầu danh sách.
- Hiển thị **preview trước khi lưu**.

### Giai đoạn 2 — Trạng thái Linh hoạt (Trung hạn)
- Cho phép **ẩn/hiện** tin (HIDDEN ↔ AVAILABLE) mà không cần xóa.
- Thêm trạng thái **"Đã giữ chỗ"** (RESERVED) khi đang trong deal.
- **Thông báo** cho người yêu thích khi giá giảm.
- Cảnh báo nếu sản phẩm chưa cập nhật quá 30 ngày.

### Giai đoạn 3 — Batch & Automation (Dài hạn)
- **Batch edit:** chọn nhiều tin → đổi giá / trạng thái hàng loạt.
- **Auto-expire:** tự động ẩn tin sau N ngày không cập nhật.
- **Version control:** xem diff giữa các lần chỉnh sửa.
