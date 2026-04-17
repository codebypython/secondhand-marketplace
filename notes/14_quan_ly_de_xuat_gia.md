# Quản Lý Đề Xuất Giá (Manage Offers)

## Nhóm chức năng
Giao dịch & Mua bán (Transactions) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Xem, chấp nhận, từ chối, hủy đề xuất giá:
- `GET /api/v1/transactions/offers/mine` — xem đề xuất đã gửi
- `GET /api/v1/transactions/offers/received` — xem đề xuất đã nhận
- `POST /api/v1/transactions/offers/{id}/accept` — chấp nhận
- `POST /api/v1/transactions/offers/{id}/decline` — từ chối
- `POST /api/v1/transactions/offers/{id}/cancel` — hủy (buyer)

## Cách mà nó nhận dữ liệu từ Client
- **GET** endpoints: Bearer token, không có body — trả về list offers.
- **POST** actions: Bearer token + path param `offer_id` (UUID), không có body.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **mine:** `SELECT FROM offers WHERE buyer_id = ? ORDER BY created_at DESC` + eager load listing.
- **received:** `SELECT FROM offers JOIN listings WHERE listings.owner_id = ?`.
- **accept:** `offer.accept()` → status=ACCEPTED, listing.reserve(), tạo Deal, từ chối các offer PENDING khác cùng listing.
- **decline:** `offer.decline()` → status=DECLINED. Chỉ listing owner.
- **cancel:** `offer.cancel()` → status=CANCELLED. Chỉ buyer.

## Cách mà luồng Backend hoạt động
```
Accept flow:
  offer.accept() → self.status = ACCEPTED
    → self.listing.reserve() → listing.status = RESERVED
    → return Deal(listing_id, buyer_id, seller_id, agreed_price, status=OPEN)
  → Decline tất cả pending offers khác cùng listing
  → session.commit() → return deal
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **Action endpoints** dùng POST thay vì PATCH — idiomatic cho state transitions.
- **Batch operation:** Accept tự động decline các pending offers khác — atomic transaction.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **State Machine:** `Offer` có 4 states (PENDING→ACCEPTED/DECLINED/CANCELLED) — transitions được enforce bởi model methods.
- **Factory Method:** `Offer.accept()` trả về `Deal` object — model tự tạo entity liên quan.
- **Cascade behavior:** Accept 1 offer → decline rest → reserve listing — **Transaction Script** pattern.
- **Authorization per action:** accept/decline chỉ cho owner, cancel chỉ cho buyer.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Dashboard `/dashboard/offers` có 3 tabs: "Đã gửi", "Đã nhận", "Thỏa thuận".
2. Tab "Đã gửi" → `api.myOffers(token)` → list offers với listing_title, giá, status badge, thời gian.
3. Tab "Đã nhận" → `api.receivedOffers(token)` → nút "Chấp nhận" / "Từ chối" cho pending offers.
4. Click chấp nhận → `api.acceptOffer(token, offer_id)` → reload data → tạo deal tự động.
5. Toast thông báo kết quả mỗi action.

## Lộ trình phát triển

### Giai đoạn 1 — Notifications & Responsiveness (Ngắn hạn)
- **Push notification/email** cho buyer khi offer được accept/decline.
- Hiển thị **badge count** trên NavBar: "3 offers mới" (chưa xem).
- Thêm **filter/sort** trên tab offers: theo status, giá, thời gian.
- **Swipe actions** trên mobile: swipe left/right để accept/decline.

### Giai đoạn 2 — Workflow Nâng cao (Trung hạn)
- **Counter-offer flow:** seller → counter → buyer → accept/decline loop.
- **Batch accept/decline:** chọn nhiều offer cùng lúc.
- **Auto-notification round 2:** nếu offer bị decline, gợi ý buyer gửi offer mới.
- **Offer analytics:** thống kê tỷ lệ accept, giá trung bình, thời gian phản hồi.

### Giai đoạn 3 — Automation & Rules (Dài hạn)
- **Auto-accept rules:** seller đặt rules (VD: accept nếu ≥ 90% giá gốc).
- **Offer expiry policy:** auto-cancel sau N giờ.
- **Smart ranking:** xếp hạng offers dựa trên trustworthiness + giá + lịch sử giao dịch buyer.
