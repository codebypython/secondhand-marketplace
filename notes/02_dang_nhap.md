# Đăng Nhập (Login)

## Nhóm chức năng
Xác thực & Quản lý tài khoản (Authentication) — Vai trò: **Khách (Guest)**

## Tên cụ thể của chức năng
Đăng nhập tài khoản (`POST /api/v1/auth/login`)

## Cách mà nó nhận dữ liệu từ Client
- Frontend gửi HTTP POST với JSON body chứa `email` và `password`.
- Pydantic schema `LoginRequest` validate dữ liệu đầu vào.
- Không yêu cầu authentication header.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Tìm user:** `SELECT * FROM users WHERE email = lower(?)` — tìm user theo email đã normalize.
2. **Xác minh mật khẩu:** `verify_password(password, user.password_hash)` — so sánh password với hash trong DB.
3. **Kiểm tra trạng thái:** `user.ensure_active()` — nếu user bị BANNED thì raise ValueError.
4. **Tạo JWT:** `create_access_token(user.id)` — tạo token chứa `sub: user_id`, `exp: now + 120 phút`.
5. **Không cập nhật DB:** Login không thay đổi dữ liệu, chỉ đọc.

## Cách mà luồng Backend hoạt động
```
Client POST /auth/login
  → FastAPI Router → login()
    → login_user(session, payload) [service]
      → select(User).where(email == ?) → tìm user
      → verify_password() → kiểm tra bcrypt hash
      → user.ensure_active() → kiểm tra ACTIVE status
      → _load_user() → eager load profile
      → TokenResponse(access_token, user)
    → HTTP 200 OK + JSON
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP POST** request qua TCP/IP tới port 8000.
- **JWT (JSON Web Token):** Token được encode bằng thuật toán HS256 với secret key, chứa payload `{sub, exp}`.
- **Stateless authentication:** Server không lưu session — client tự quản lý token.
- **CORS headers:** `Access-Control-Allow-Origin: http://localhost:3000`.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`User.ensure_active()`** — method trên ORM model thể hiện **Encapsulation**: logic kiểm tra trạng thái được đóng gói trong chính model.
- **`TokenResponse(BaseModel)`** — DTO pattern, tách biệt response schema khỏi ORM model.
- **`verify_password()`** function trong module `security.py` — **Utility/Helper pattern**, tách biệt logic mã hóa.
- **Dependency Injection:** `session = Depends(get_db_session)` — FastAPI DI container inject database session.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. User điền email + password trên trang `/login`.
2. Submit → `api.login({ email, password })` → POST `/api/v1/auth/login`.
3. Nhận `{ access_token, user }` → `setSession(token, user)`.
4. `localStorage` được cập nhật → AuthProvider re-render.
5. NavBar chuyển từ "Sign in / Register" → avatar + tên + "Sign out".
6. Redirect tới `/` (trang chủ).
7. Nếu sai mật khẩu → Toast đỏ "Invalid credentials".

## Lộ trình phát triển

### Giai đoạn 1 — Bảo mật Cơ bản (Ngắn hạn)
- Thêm **rate limiting** đăng nhập (tối đa 5 lần thất bại → khóa 15 phút).
- Thêm **"Ghi nhớ đăng nhập"** checkbox — kéo dài token expiry (7 ngày).
- Hiển thị **"Quên mật khẩu?"** link trên trang login → chức năng reset password.
- Mask/unmask password input (toggle hiển thị mật khẩu).
- Log lịch sử đăng nhập (IP, thời gian, device).

### Giai đoạn 2 — Xác thực Nhiều lớp (Trung hạn)
- **Two-Factor Authentication (2FA)** qua TOTP (Google Authenticator).
- Gửi **OTP qua email** khi phát hiện đăng nhập từ thiết bị lạ.
- Tích hợp **OAuth2 login** (Google, Facebook) — tránh cần nhớ mật khẩu.
- Hiển thị **thiết bị đang đăng nhập** trong trang profile.

### Giai đoạn 3 — Enterprise Security (Dài hạn)
- Hỗ trợ **Refresh Token** + **Token Rotation** (chống token theft).
- **Session management:** quản lý sessions (revoke session từ xa).
- **Brute-force detection:** ban IP khi quá nhiều lần thất bại.
- **Passwordless login:** gửi magic link qua email.
- Audit trail: log chi tiết mọi lần xác thực.
