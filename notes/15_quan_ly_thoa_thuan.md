# Quản Lý Thỏa Thuận (Manage Deals)

## Nhóm chức năng
Giao dịch & Mua bán (Transactions) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Xem, hoàn thành, hủy thỏa thuận mua bán:
- `GET /api/v1/transactions/deals` — danh sách thỏa thuận
- `POST /api/v1/transactions/deals/{id}/complete` — hoàn thành giao dịch
- `POST /api/v1/transactions/deals/{id}/cancel` — hủy giao dịch

## Cách mà nó nhận dữ liệu từ Client
- **GET:** Bearer token → trả về deals mà user là buyer hoặc seller.
- **POST actions:** Bearer token + path param `deal_id` (UUID).

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **list:** `SELECT FROM deals WHERE buyer_id = ? OR seller_id = ?` + eager load listing + meetups.
- **complete:** `deal.complete(listing)` → deal.status=COMPLETED, listing.mark_sold() → listing.status=SOLD.
- **cancel:** `deal.cancel(listing)` → deal.status=CANCELLED, listing.reopen() → listing.status=AVAILABLE.
- Cả hai chỉ cho participants (buyer hoặc seller).

## Cách mà luồng Backend hoạt động
```
Complete:
  deal.complete(listing) → self.status = COMPLETED
    → listing.mark_sold() → listing.status = SOLD  (chỉ từ RESERVED)
  → session.commit()

Cancel:
  deal.cancel(listing) → self.status = CANCELLED
    → listing.reopen() → listing.status = AVAILABLE  (từ RESERVED/HIDDEN)
  → session.commit()
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **Action endpoints:** POST cho state transitions — RESTful convention.
- **Atomic operation:** Deal + Listing cùng update trong 1 commit.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Deal` model** có 3 states (OPEN→COMPLETED/CANCELLED) — **State pattern**.
- **`deal.complete(listing)`** nhận listing param — **Double Dispatch** để cập nhật cả 2 entity.
- **Listing state machine:** AVAILABLE→RESERVED→SOLD (hoặc AVAILABLE lại nếu cancel) — **Finite State Machine**.
- **`_deal_to_read()`** serializer helper — **Adapter pattern** thêm listing_title + meetups vào response.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Dashboard tab "Thỏa thuận" → `api.listDeals(token)`.
2. Mỗi deal hiển thị: listing_title (link), giá thỏa thuận, status badge, thời gian.
3. **Progress tracker** 3 bước: Chấp nhận ✓ → Hẹn gặp → Hoàn thành.
4. Hiển thị meetups đã đặt (ngày giờ + địa điểm).
5. Nút "Hoàn thành" → `api.completeDeal(token, deal_id)` → Toast "Giao dịch hoàn thành! 🎉".
6. Nút "Hủy" → `api.cancelDeal(token, deal_id)` → listing trở lại AVAILABLE.

## Lộ trình phát triển

### Giai đoạn 1 — Deal Tracking & Feedback (Ngắn hạn)
- **Review/Rating** sau khi deal hoàn thành (1-5 sao + comment).
- Hiển thị **timeline** chi tiết: offer → accepted → meetup → completed.
- **Lý do hủy bắt buộc** khi cancel deal.
- Thêm trạng thái **"Đang giao"** cho shipping.

### Giai đoạn 2 — Escrow & Protection (Trung hạn)
- **Escrow payment:** giữ tiền cho đến khi buyer xác nhận nhận hàng.
- **Dispute resolution:** hệ thống giải quyết tranh chấp (buyer khiếu nại).
- **Delivery tracking:** tích hợp mã vận đơn (GHN, GHTK, J&T).
- **Deal chat:** conversation riêng cho deal (khác với chat thường).

### Giai đoạn 3 — Analytics & Contracts (Dài hạn)
- **Digital receipt:** tạo biên lai điện tử (PDF) cho giao dịch.
- **Deal analytics:** thống kê revenue, completion rate, thời gian trung bình.
- **Smart contract** (optional): blockchain-based proof of transaction.
- **Cancellation penalty:** tính phí/giảm trust score khi hủy nhiều deal.
