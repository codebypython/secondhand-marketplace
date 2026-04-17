# Cập Nhật Hồ Sơ Cá Nhân (Update Profile)

## Nhóm chức năng
Quản lý tài khoản (Account Management) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Chỉnh sửa thông tin hồ sơ (`PATCH /api/v1/users/me`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP PATCH request với `Authorization: Bearer <token>` và JSON body.
- Body chứa các field tùy chọn: `full_name`, `avatar_url`, `bio`.
- Pydantic schema `ProfileUpdate` với `exclude_unset=True` cho partial update.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Xác thực user:** `Depends(get_current_user)` → decode JWT, load user.
2. **Tìm/tạo Profile:** Nếu user chưa có profile → tạo mới `Profile(user=user, full_name=email_prefix)`.
3. **Partial update:** `payload.model_dump(exclude_unset=True)` → chỉ lấy fields được gửi.
4. **Setattr loop:** `setattr(profile, field, value)` → cập nhật từng field.
5. **Commit:** `session.add(profile) → session.commit()`.
6. **Reload:** `_load_user(session, user.id)` → trả về user đã cập nhật với profile mới.

## Cách mà luồng Backend hoạt động
```
Client PATCH /users/me + Bearer token + JSON body
  → FastAPI → patch_me()
    → get_current_user() → authenticate
    → update_profile(session, user, payload) [service]
      → user.profile or Profile(user=user) → tạo nếu chưa có
      → payload.model_dump(exclude_unset=True) → partial fields
      → setattr loop → cập nhật ORM object
      → session.commit()
      → _load_user() → reload with profile
    → HTTP 200 + JSON UserRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP PATCH** (không phải PUT) — partial update, chỉ gửi fields cần thay đổi.
- **Bearer authentication** trong header.
- **JSON request/response** qua HTTP body.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Partial Update Pattern:** `model_dump(exclude_unset=True)` — chỉ cập nhật fields có trong request.
- **Lazy Initialization:** Profile được tạo lần đầu khi user cập nhật — **Lazy Factory**.
- **Separation of Concerns:** Controller (endpoint) chỉ handle HTTP, service handle business logic, model handle data.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang `/profile` hiển thị form chỉnh sửa với 3 fields: Họ tên, Avatar URL, Bio.
2. User thay đổi → submit form → `api.updateProfile(token, { full_name, avatar_url, bio })`.
3. PATCH request gửi lên backend → nhận response user mới.
4. `refreshUser()` → cập nhật React state + localStorage.
5. NavBar re-render hiển thị tên mới.
6. Toast xanh "Cập nhật hồ sơ thành công!".

## Lộ trình phát triển

### Giai đoạn 1 — Upload Ảnh Đại Diện (Ngắn hạn)
- Thay **`avatar_url` text input** bằng **file upload** (drag & drop).
- Tích hợp **image cropper** để crop ảnh thành hình vuông.
- Lưu ảnh lên **cloud storage** (AWS S3 / Cloudinary) thay vì chỉ URL.
- Thêm **preview ảnh** trước khi upload.

### Giai đoạn 2 — Profile Fields Mở rộng (Trung hạn)
- Thêm fields: **số điện thoại**, **địa chỉ**, **ngày sinh**, **giới tính**.
- Thêm **tên hiển thị (display name)** khác với full_name.
- Cho phép thêm **liên kết mạng xã hội** (Facebook, Zalo, Instagram).
- **Validation** SĐT (10 số VN), ngày sinh (>= 18 tuổi).

### Giai đoạn 3 — Đổi mật khẩu & Xóa tài khoản (Dài hạn)
- Chức năng **đổi mật khẩu**: yêu cầu nhập mật khẩu cũ + mật khẩu mới.
- **Xóa tài khoản vĩnh viễn** (GDPR compliance): soft delete → hard delete sau 30 ngày.
- **Đổi email**: gửi link xác nhận tới email mới.
- Audit log: ghi lại mọi thay đổi profile (ai, lúc nào, field nào).
