# Xem Hồ Sơ Công Khai (Public Profile)

## Nhóm chức năng
Mạng xã hội (Social) — Vai trò: **Khách / Người dùng (Guest/User)**

## Tên cụ thể của chức năng
Xem hồ sơ công khai của người dùng khác (`GET /api/v1/users/{user_id}`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP GET request với `user_id` (UUID) là path parameter trong URL.
- Không yêu cầu authentication — endpoint công khai.
- Ví dụ URL: `/api/v1/users/0f8eea14-9dcc-4809-a4c8-dd90a7fce100`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Parse path param:** FastAPI tự parse `user_id` string thành `UUID` object.
2. **Query user:** `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL` (soft delete filter tự động).
3. **Eager load profile:** `selectinload(User.profile)` — load profile trong cùng query.
4. **404 nếu không tìm thấy:** Raise HTTPException 404.
5. **Trả về UserPublicRead:** Schema chỉ expose `id`, `created_at`, `profile` (full_name, avatar_url, bio) — không expose email, role, status.

## Cách mà luồng Backend hoạt động
```
Client GET /users/{user_id}
  → FastAPI → get_public_profile(user_id: UUID)
    → select(User).options(selectinload(User.profile)).where(id == ?)
    → Soft delete filter tự động thêm WHERE deleted_at IS NULL
    → session.scalar(stmt) → User object hoặc None
    → None → HTTP 404 "User not found"
    → User → serialize thành UserPublicRead → HTTP 200 + JSON
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **RESTful URL design:** `/users/{id}` — resource-based routing.
- **HTTP GET** — safe, idempotent, cacheable.
- **Path parameter parsing:** FastAPI tự convert string → UUID.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`UserPublicRead` vs `UserRead`** — Hai schema khác nhau cho cùng model User, thể hiện **Facade pattern**: public schema ẩn thông tin nhạy cảm (email, role).
- **`SoftDeleteMixin`** — qua event listener `do_orm_execute`, tự động filter deleted records — **Aspect-Oriented** behavior.
- **`selectinload`** — SQLAlchemy eager loading strategy — **Lazy vs Eager Loading** OOP pattern.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. User click vào avatar/tên người bán trên card sản phẩm → navigate `/users/{owner_id}`.
2. Trang `users/[userId]/page.tsx` mount → gọi `api.getUser(userId)` + `api.getUserListings(userId)` (2 API calls độc lập).
3. `getUser` response → hiển thị avatar initials, tên, bio, ngày tham gia.
4. `getUserListings` response → hiển thị grid sản phẩm với badge trạng thái, giá, thời gian.
5. Nếu user không tồn tại → hiển thị "Người dùng không tồn tại" + nút về trang chủ.
6. Loading state → hiển thị skeleton placeholder.

## Lộ trình phát triển

### Giai đoạn 1 — Thông tin Công khai Phong phú (Ngắn hạn)
- Hiển thị **đánh giá từ người mua** (rating sao + comment).
- Thêm **badge xác minh** ("Đã xác minh SĐT", "Đã xác minh email").
- Hiển thị **tỷ lệ phản hồi** và **thời gian phản hồi trung bình**.
- Thêm **"Hoạt động gần đây"**: thời gian online cuối cùng.

### Giai đoạn 2 — Tương tác Xã hội (Trung hạn)
- Nút **"Theo dõi"** người bán → nhận thông báo khi có tin mới.
- Hiển thị **số người theo dõi / đang theo dõi**.
- Hệ thống **đánh giá & nhận xét** (review sau giao dịch hoàn thành).
- **Chia sẻ hồ sơ** lên mạng xã hội (Facebook, Zalo).
- Thêm **tabs** trên profile: Đang bán / Đã bán / Đánh giá.

### Giai đoạn 3 — Seller Analytics & Trust (Dài hạn)
- **Trust Score** tổng hợp: dựa trên đánh giá, tỷ lệ hoàn thành, thời gian hoạt động.
- **Seller tier** (Bronze/Silver/Gold) dựa trên volume giao dịch.
- Hồ sơ SEO-friendly với **meta tags** cho Google indexing.
- **QR code** hồ sơ cá nhân để chia sẻ ngoại tuyến.
