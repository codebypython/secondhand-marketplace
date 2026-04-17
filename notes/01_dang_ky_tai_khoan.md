# Đăng Ký Tài Khoản (Register)

## Nhóm chức năng
Xác thực & Quản lý tài khoản (Authentication) — Vai trò: **Khách (Guest)**

## Tên cụ thể của chức năng
Đăng ký tài khoản mới (`POST /api/v1/auth/register`)

## Cách mà nó nhận dữ liệu từ Client
- Frontend gửi HTTP POST request với body JSON chứa `email`, `password`, `full_name`.
- Schema validation qua Pydantic `RegisterRequest`: email là string hợp lệ, password là string, full_name là string.
- Content-Type: `application/json`.
- Không yêu cầu authentication header (endpoint công khai).

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Kiểm tra trùng lặp:** Query `SELECT * FROM users WHERE email = ?` để kiểm tra email đã tồn tại chưa.
2. **Hash mật khẩu:** Sử dụng `pwdlib.PasswordHash.recommended()` để hash password bằng thuật toán bcrypt/argon2.
3. **Tạo User:** INSERT vào bảng `users` với email (lowercase), password_hash, role=USER, status=ACTIVE.
4. **Tạo Profile:** INSERT vào bảng `profiles` với user_id (FK), full_name từ payload.
5. **Commit transaction:** SQLAlchemy session commit đảm bảo cả User và Profile được lưu atomic.
6. **Tạo JWT token:** Gọi `create_access_token(user.id)` để tạo access token JWT.

## Cách mà luồng Backend hoạt động
```
Client POST /auth/register
  → FastAPI Router (auth.py) → register()
    → Depends(get_db_session) → tạo SQLAlchemy Session
    → register_user(session, payload) [service layer]
      → session.scalar(select User where email) → kiểm tra trùng
      → hash_password(payload.password) → bcrypt hash
      → User(...) + Profile(full_name=...) → ORM objects
      → session.add(user) → session.commit()
      → _load_user(session, user.id) → eager load profile
      → TokenResponse(access_token=jwt, user=hydrated)
    → HTTP 201 Created + JSON response
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP/1.1 POST** request từ browser tới FastAPI server qua TCP socket.
- **CORS:** Backend cấu hình `CORSMiddleware` cho phép origin `http://localhost:3000`.
- **JSON serialization:** Request body được parse từ JSON (Content-Type: application/json). Response body được serialize từ Pydantic model sang JSON.
- **Stateless:** Sau khi đăng ký, server trả JWT token — client lưu token này cho các request tiếp theo (không cần session server-side).

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Model `User`** kế thừa `Base`, `UUIDMixin`, `TimestampMixin`, `SoftDeleteMixin` — thể hiện **Inheritance (kế thừa)** và **Mixin pattern**.
- **Model `Profile`** có quan hệ one-to-one với `User` qua `relationship()` — thể hiện **Composition (kết hợp)**.
- **Schema `RegisterRequest(BaseModel)`** kế thừa Pydantic BaseModel — **Data Transfer Object (DTO)** pattern.
- **Service function `register_user()`** — tách biệt business logic khỏi controller — **Service Layer pattern**.
- **`User.validate_email()`** sử dụng SQLAlchemy `@validates` decorator — **Validator pattern**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. User điền form đăng ký trên trang `/register` (React component).
2. Khi submit form, gọi `api.register({ email, password, full_name })` — fetch POST tới `/api/v1/auth/register`.
3. Nhận response `{ access_token, user }`.
4. Gọi `setSession(token, user)` → lưu token + user vào `localStorage`.
5. React state update → NavBar re-render hiển thị avatar + tên user thay vì nút "Sign in".
6. Redirect tới trang chủ `/`.
7. Nếu lỗi (email trùng), hiển thị Toast notification đỏ với message lỗi.

## Lộ trình phát triển

### Giai đoạn 1 — Cải thiện Validation & UX (Ngắn hạn)
- Thêm **password strength meter** trên frontend (tối thiểu 8 ký tự, chữ hoa, số, ký tự đặc biệt).
- Validate email format phía client (regex) trước khi gửi lên server.
- Thêm **confirm password** field để tránh nhập sai.
- Hiển thị loading spinner khi đang gửi request.
- Thêm **rate limiting** (ví dụ: tối đa 5 lần đăng ký/phút/IP) để chống spam.

### Giai đoạn 2 — Xác minh Email (Trung hạn)
- Gửi **email xác minh** sau khi đăng ký (tạo token + link verify).
- User status = `PENDING_VERIFICATION` cho đến khi click verify link.
- Thêm trang "Kiểm tra email" sau đăng ký.
- Endpoint `POST /auth/verify-email?token=...` để xác nhận.

### Giai đoạn 3 — Đăng nhập Xã hội & Bảo mật (Dài hạn)
- Tích hợp **OAuth2**: đăng ký/đăng nhập qua Google, Facebook.
- Thêm **CAPTCHA** (reCAPTCHA/hCaptcha) chống bot.
- Hỗ trợ **Refresh Token** (access token ngắn hạn + refresh token dài hạn).
- Thêm **Terms of Service** checkbox bắt buộc khi đăng ký.
- Logging đăng ký thất bại để phát hiện tấn công brute-force.
