# Hẹn Gặp Giao Dịch (Schedule Meetup)

## Nhóm chức năng
Giao dịch & Mua bán (Transactions) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Đặt lịch hẹn gặp để giao dịch (`POST /api/v1/transactions/meetups`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + Bearer token + JSON body: `{ deal_id: UUID, scheduled_at: datetime, location?: object }`.
- `location` là JSON object tùy ý, ví dụ: `{ address: "Quán cafe ABC, Q1" }`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Load deal:** `get_deal_or_error()` + eager load listing + meetups.
2. **Authorization:** Kiểm tra `actor.id in {deal.buyer_id, deal.seller_id}`.
3. **Status check:** `deal.status == DealStatus.OPEN` — chỉ deal đang mở.
4. **Tạo meetup:** `INSERT INTO meetups(deal_id, scheduled_at, location, status='SCHEDULED')`.
5. **Commit + refresh.**

## Cách mà luồng Backend hoạt động
```
POST /transactions/meetups + Bearer + JSON
  → authenticate → schedule_meetup(session, actor, payload)
    → get_deal_or_error() → load deal + listing + meetups
    → check actor is participant
    → check deal.status == OPEN
    → Meetup(deal_id, scheduled_at, location) → INSERT
    → session.commit() → MeetupRead → HTTP 201
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **POST** tạo resource → 201 Created.
- **DateTime ISO 8601:** `scheduled_at` truyền dưới dạng ISO string, parse thành Python datetime.
- **JSONB storage:** `location` lưu dưới dạng JSONB trong PostgreSQL (JSON trong SQLite).

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Meetup` model** — entity con của Deal, quan hệ **One-to-Many** (Deal → Meetups).
- **`cascade="all, delete-orphan"`** — ORM cascade cho lifecycle management.
- **`MeetupStatus` enum** (SCHEDULED/COMPLETED/CANCELLED) — **State pattern**.
- **JSONB `location`** — **Schemaless** storage cho dữ liệu linh hoạt.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Dashboard → deal card → nút "📅 Hẹn gặp" → expand inline form.
2. Form: input datetime-local + input text địa điểm (tùy chọn).
3. Submit → `api.scheduleMeetup(token, { deal_id, scheduled_at, location: { address } })`.
4. Thành công → Toast "Đã hẹn gặp thành công!" → reload deals.
5. Meetup hiển thị: icon 📅 + datetime + icon 📍 + address + status badge.
6. Progress tracker cập nhật bước 2 "Hẹn gặp" ✓.

## Lộ trình phát triển

### Giai đoạn 1 — Xác nhận & Reminder (Ngắn hạn)
- **Xác nhận từ cả 2 bên:** buyer + seller đều phải confirm lịch hẹn.
- **Reminder notification:** nhắc nhở trước 1 giờ và 24 giờ.
- Cho phép **hủy/dời lịch** meetup.
- Thêm field **ghi chú** (VD: "Mang theo adapter để test").

### Giai đoạn 2 — Location & Scheduling (Trung hạn)
- **Bản đồ chọn điểm hẹn** (Google Maps / Mapbox picker).
- **Suggest safe locations:** gợi ý điểm hẹn an toàn (quán cafe, sảnh chung cư).
- **Calendar sync:** export lịch hẹn tới Google Calendar / Apple Calendar.
- **Multiple time slots:** đề xuất nhiều khung giờ để đối tác chọn.
- **Check-in:** cả 2 bên check-in khi tới điểm hẹn.

### Giai đoạn 3 — Safety & Automation (Dài hạn)
- **Safety check:** chia sẻ vị trí real-time với người thân khi đi gặp.
- **Meetup verification:** xác nhận hoàn thành bằng QR code scan.
- **Integrated video call:** hẹn video call thay vì gặp mặt.
- **Smart scheduling:** AI gợi ý thời gian phù hợp dựa trên lịch trình 2 bên.
