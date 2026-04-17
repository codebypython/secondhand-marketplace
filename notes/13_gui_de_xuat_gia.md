# Gửi Đề Xuất Giá (Create Offer)

## Nhóm chức năng
Giao dịch & Mua bán (Transactions) — Vai trò: **Người dùng (User/Buyer)**

## Tên cụ thể của chức năng
Tạo đề xuất giá cho sản phẩm (`POST /api/v1/transactions/offers`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + Bearer token + JSON body: `{ listing_id: UUID, price: Decimal }`.
- Pydantic schema: `OfferCreate` với `price >= 0` (Field validator).

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Load listing:** `SELECT * FROM listings WHERE id = ?`.
2. **Kiểm tra self-offer:** `listing.owner_id == buyer.id` → raise "cannot offer on own listing".
3. **Kiểm tra block:** `ensure_not_blocked(session, buyer.id, listing.owner_id)`.
4. **Kiểm tra available:** `listing.is_available()` → kiểm tra status AVAILABLE + not deleted.
5. **Tạo offer:** `INSERT INTO offers(listing_id, buyer_id, price, status='PENDING')`.
6. **Commit + refresh.**

## Cách mà luồng Backend hoạt động
```
Client POST /transactions/offers + Bearer + JSON
  → authenticate → create_offer(session, buyer, payload) [service]
    → load listing → check owner ≠ buyer
    → ensure_not_blocked() → kiểm tra blocks table
    → listing.is_available() → status + soft delete check
    → Offer(listing_id, buyer_id, price) → INSERT
    → session.commit() → HTTP 201 + OfferRead JSON
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **POST** tạo resource mới → 201 Created.
- **Business validation** trước khi persist: network round-trip chỉ 1 lần.
- **Decimal precision:** Giá được truyền dưới dạng number trong JSON, parse thành Python Decimal → database Numeric(12,2).

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Offer` model** có methods: `accept()`, `decline()`, `cancel()` — **State Machine pattern**, mỗi method chuyển status.
- **`Offer.accept()` tạo `Deal`** — **Factory Method** pattern: Offer tạo Deal object.
- **`ensure_not_blocked()`** — **Guard/Precondition** pattern.
- **CheckConstraint("price >= 0")** — Database-level invariant.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang listing detail → form "Đề xuất giá" với input số tiền.
2. Submit → `api.createOffer(token, { listing_id, price })`.
3. Thành công → Toast "Đã gửi đề xuất giá!" → reset form.
4. Lỗi (bị block, sản phẩm hết) → Toast đỏ.

## Lộ trình phát triển

### Giai đoạn 1 — UX & Validation (Ngắn hạn)
- Hiển thị **giá gốc** bên cạnh input → người mua biết mức giảm %.
- **Giới hạn số offer** mỗi user trên 1 listing (tránh spam).
- Thêm **message kèm offer** — lời nhắn cho seller.
- Hiển thị **lịch sử offer** trước đó của user trên listing này.

### Giai đoạn 2 — Counter-Offer & Negotiation (Trung hạn)
- **Counter-offer:** seller đề xuất giá ngược lại thay vì chỉ accept/decline.
- **Auto-expire offer** sau 48h nếu seller không phản hồi.
- **Thông báo real-time** cho seller khi có offer mới (WebSocket/push).
- **Offer comparison:** seller xem tất cả offer trên 1 listing dạng bảng so sánh.

### Giai đoạn 3 — Auction & Smart Pricing (Dài hạn)
- **Auction mode:** cho phép listing chuyển sang đấu giá.
- **Best offer auto-accept:** seller đặt giá tối thiểu → auto accept nếu offer ≥ mức đó.
- **Price analytics:** biểu đồ offer history, giá trung bình thị trường.
