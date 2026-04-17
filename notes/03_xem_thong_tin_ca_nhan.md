# Xem Thông Tin Cá Nhân (Get My Profile)

## Nhóm chức năng
Xác thực & Quản lý tài khoản (Authentication) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Xem thông tin người dùng hiện tại (`GET /api/v1/auth/me`)

## Cách mà nó nhận dữ liệu từ Client
- Frontend gửi HTTP GET request với header `Authorization: Bearer <JWT_TOKEN>`.
- Không có request body — chỉ cần token trong header.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Decode JWT:** `decode_access_token(token)` → trích xuất `user_id` từ payload.
2. **Query user:** `session.get(User, user_id)` — lấy user theo primary key.
3. **Kiểm tra tồn tại:** Nếu user không tồn tại → HTTP 401.
4. **Kiểm tra trạng thái:** `user.ensure_active()` → nếu BANNED → HTTP 403.
5. **Không cập nhật DB:** Chỉ đọc dữ liệu.

## Cách mà luồng Backend hoạt động
```
Client GET /auth/me + Authorization header
  → FastAPI → me() endpoint
    → Depends(get_current_user)
      → HTTPBearer → extract token từ header
      → decode_access_token(token) → user_id (UUID)
      → session.get(User, user_id) → load user
      → user.ensure_active() → kiểm tra status
    → return current_user → Pydantic UserRead serialize
  → HTTP 200 + JSON {id, email, role, status, profile, created_at}
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **Bearer Token Authentication:** JWT được gửi qua HTTP header `Authorization: Bearer xyz`.
- **HTTP GET** — idempotent, không thay đổi state trên server.
- **JSON response:** Pydantic model serialize thành JSON với nested profile object.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Dependency Injection Chain:** `get_current_user()` depends on `HTTPBearer()` → thể hiện **Chain of Responsibility**.
- **`UserRead(ORMModel)`** kế thừa `ORMModel` (có `model_config = ConfigDict(from_attributes=True)`) — **Adapter pattern** chuyển đổi ORM object sang response schema.
- **`User` ↔ `Profile` relationship** — **One-to-One Association** trong OOP.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. `AuthProvider.refreshUser()` gọi `api.me(token)` → GET `/auth/me`.
2. Response user data được lưu vào React state và `localStorage`.
3. Trang `/profile` hiển thị: avatar initials, full_name, email, role badge, status badge, ngày tạo.
4. Trang `/profile` cũng load `api.getUserListings(user.id)` để hiển thị danh sách tin đăng của user.

## Lộ trình phát triển

### Giai đoạn 1 — Thông tin Chi tiết hơn (Ngắn hạn)
- Hiển thị **số lượng giao dịch hoàn thành**, đánh giá trung bình, tỷ lệ phản hồi.
- Thêm **bảng thống kê hoạt động**: tổng tin đăng, đã bán, đang chờ duyệt.
- Hiển thị **lịch sử đăng nhập** gần nhất (thời gian, thiết bị).
- Thêm field **số điện thoại** (tùy chọn, có thể ẩn/hiện).

### Giai đoạn 2 — Tùy chỉnh & Bảo mật (Trung hạn)
- Cho phép **đổi mật khẩu** trực tiếp từ trang profile.
- Thêm **xác minh danh tính** (CMND/CCCD) → badge "Đã xác minh".
- Cài đặt **thông báo**: email, push notification, trong app.
- Tùy chỉnh **quyền riêng tư**: ẩn/hiện email, SĐT, lịch sử giao dịch.

### Giai đoạn 3 — Dashboard Cá nhân (Dài hạn)
- **Dashboard analytics:** biểu đồ doanh thu, lượt xem tin, tỷ lệ chuyển đổi.
- Hiển thị **ví điện tử**: số dư, lịch sử giao dịch tiền.
- **Subscription/Premium tier:** gói hội viên với ưu đãi đăng tin.
- Export báo cáo hoạt động (PDF/CSV).
