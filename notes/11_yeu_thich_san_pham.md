# Yêu Thích Sản Phẩm (Toggle Favorite)

## Nhóm chức năng
Mạng xã hội (Social) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Thêm/bỏ yêu thích sản phẩm (`POST /api/v1/listings/{listing_id}/favorite`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + Bearer token.
- Path param: `listing_id` (UUID).
- Không có request body — toggle dựa trên trạng thái hiện tại.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Load listing:** `get_listing_or_error()`.
2. **Kiểm tra favorite:** `listing in user.favorites` — SQLAlchemy M2M relationship qua bảng `user_favorite_listing`.
3. **Toggle:**
   - Đã thích → `user.favorites.remove(listing)` → DELETE FROM user_favorite_listing.
   - Chưa thích → `user.favorites.append(listing)` → INSERT INTO user_favorite_listing.
4. **Commit:** `session.commit()`.
5. **Trả về:** `FavoriteResponse(favorite=True/False)`.

## Cách mà luồng Backend hoạt động
```
Client POST /listings/{id}/favorite + Bearer
  → authenticate
  → toggle_favorite(session, user, listing_id) [service]
    → get_listing_or_error() → load listing
    → listing in user.favorites? → check M2M
    → remove hoặc append → toggle
    → session.commit()
    → return True/False
  → FavoriteResponse(favorite=bool) → HTTP 200
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **HTTP POST** cho toggle action — không phải GET vì có side effect.
- **Idempotent toggle:** Gửi lại sẽ toggle ngược → cần UI sync.
- **Response nhỏ:** Chỉ trả `{favorite: true/false}`.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Many-to-Many relationship:** `user_favorite_listing` association table — **Association pattern** trong ORM.
- **`User.favorites` collection** — SQLAlchemy dynamic relationship proxy — **Proxy pattern**.
- **Toggle logic** encapsulated trong service function — **Command pattern**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang listing detail → nút "🤍 Yêu thích" / "❤️ Đã thích".
2. Click → `api.toggleFavorite(token, listing_id)` → POST.
3. Response `{favorite: true}` → update state → nút chuyển từ 🤍 → ❤️.
4. Toast: "Đã thêm vào yêu thích ❤️" hoặc "Đã bỏ yêu thích".

## Lộ trình phát triển

### Giai đoạn 1 — Trang Yêu Thích & Sync (Ngắn hạn)
- Tạo trang **"Yêu thích của tôi"** (`/favorites`) — hiển thị grid sản phẩm đã thích.
- **Sync trạng thái yêu thích** khi load listing: kiểm tra user đã thích chưa.
- Hiển thị **số lượt yêu thích** trên mỗi card sản phẩm ("❤️ 15").
- Nút yêu thích trên **trang chủ** (không cần vào chi tiết).

### Giai đoạn 2 — Wishlist & Notifications (Trung hạn)
- **Wishlist collections:** tạo nhiều bộ sưu tập (VD: "Điện thoại đang theo dõi", "Laptop muốn mua").
- **Thông báo giảm giá:** push notification khi sản phẩm yêu thích được giảm giá.
- **Thông báo tình trạng:** thông báo khi sản phẩm sắp bị xóa hoặc hết hàng.
- **Chia sẻ wishlist** cho bạn bè.

### Giai đoạn 3 — Analytics & Recommendation (Dài hạn)
- **Seller insights:** cho seller xem ai đã thích sản phẩm → gợi ý gửi ưu đãi.
- **Recommendation feed:** "Vì bạn đã thích X, có thể bạn sẽ thích Y".
- **Price alert:** đặt mức giá mong muốn → thông báo khi đạt.
