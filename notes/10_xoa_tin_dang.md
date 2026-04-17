# Xóa Tin Đăng (Delete Listing)

## Nhóm chức năng
Quản lý tin đăng (Listings) — Vai trò: **Người dùng (User)** — chỉ chủ sở hữu

## Tên cụ thể của chức năng
Xóa mềm tin đăng (`DELETE /api/v1/listings/{listing_id}`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP DELETE + Bearer token.
- Path param: `listing_id` (UUID).
- Không có request body.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Load listing:** `get_listing_or_error()`.
2. **Authorization:** Kiểm tra `owner_id == actor.id`.
3. **Soft delete:** `listing.soft_delete()` → set `deleted_at = now()`, `updated_at = now()`.
4. **Commit:** Listing vẫn tồn tại trong DB nhưng bị filter bởi `SoftDeleteMixin`.

## Cách mà luồng Backend hoạt động
```
Client DELETE /listings/{id} + Bearer
  → authenticate → load listing → check owner
  → listing.soft_delete() → deleted_at = datetime.now(UTC)
  → session.commit()
  → HTTP 204 No Content (không có response body)
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP DELETE** — xóa resource, trả về 204 No Content.
- **Soft delete:** Không thực sự xóa khỏi DB — có thể restore sau.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`SoftDeleteMixin.soft_delete()`** — **Mixin pattern** + **State pattern** (đánh dấu deleted thay vì xóa thật).
- **`is_deleted` property** — **Computed property** trên ORM model.
- **Event listener `do_orm_execute`** — **Observer pattern** tự động filter deleted records.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Chủ tin đăng click "Xóa" → confirmation dialog.
2. Xác nhận → `api.deleteListing(token, listing_id)` → DELETE request.
3. Thành công (204) → redirect về trang chủ hoặc profile.
4. Listing biến mất khỏi danh sách vì soft delete filter.

## Lộ trình phát triển

### Giai đoạn 1 — Confirmation & Undo (Ngắn hạn)
- **Confirmation modal** rõ ràng: "Bạn chắc chắn muốn xóa? Tin đăng sẽ bị ẩn khỏi marketplace."
- Thêm **"Undo" (hoàn tác)** — cho phép khôi phục trong 30 giây.
- Kiểm tra **ràng buộc**: không cho xóa tin đang có deal OPEN.
- Hiển thị cảnh báo nếu tin đang có offer PENDING.

### Giai đoạn 2 — Recycle Bin & Policy (Trung hạn)
- **Thùng rác (Recycle Bin):** hiển thị tin đã xóa, cho phép khôi phục trong 30 ngày.
- **Hard delete** sau 30 ngày (background job/cron).
- Admin có quyền **force delete** bất kỳ tin nào (vi phạm chính sách).
- **Cascade handling:** tự động hủy offer PENDING, thông báo cho buyer.

### Giai đoạn 3 — Archive & Compliance (Dài hạn)
- **Archive mode:** thay vì xóa, chuyển sang "Đã lưu trữ" (có thể tái đăng).
- **Data retention policy:** tuân thủ GDPR — xóa dữ liệu theo yêu cầu.
- Audit log: ghi lại ai xóa, lúc nào, lý do.
