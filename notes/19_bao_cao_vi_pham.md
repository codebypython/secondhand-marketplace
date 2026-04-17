# Báo Cáo Vi Phạm (Report)

## Nhóm chức năng
Kiểm duyệt & An toàn (Moderation) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Gửi báo cáo vi phạm cho sản phẩm hoặc người dùng (`POST /api/v1/moderation/reports`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + Bearer token + JSON: `{ target_type: "LISTING"|"USER", target_id: UUID, reason: string }`.
- `target_type` là enum xác định đối tượng bị báo cáo.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Authenticate user.**
2. **Tạo report:** `INSERT INTO reports(reporter_id, target_type, target_id, reason, status='PENDING')`.
3. **Commit + refresh.**

## Cách mà luồng Backend hoạt động
```
POST /moderation/reports + Bearer + JSON
  → authenticate → create_report(session, reporter, payload)
    → Report(reporter_id, target_type, target_id, reason)
    → session.add(report) → session.commit() → session.refresh(report)
    → HTTP 201 + ReportRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **POST** → 201 Created.
- **Polymorphic target:** `target_type + target_id` cho phép report nhiều loại entity.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Generic FK:** `target_type` (enum) + `target_id` (UUID) — **Polymorphic Association** pattern.
- **`ReportStatus` enum** (PENDING→RESOLVED/DISMISSED) — **State pattern**.
- **`ReportTargetType` enum** — **Strategy selector** cho target type.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang listing detail → "🚩 Báo cáo vi phạm" → expand form.
2. Nhập lý do → submit → `api.createReport(token, { target_type: "LISTING", target_id, reason })`.
3. Toast "Đã gửi báo cáo." → collapse form.

## Lộ trình phát triển

### Giai đoạn 1 — UX & Phản hồi (Ngắn hạn)
- Thêm **danh sách lý do** mẫu (dropdown): hàng giả, lừa đảo, nội dung không phù hợp, spam.
- Cho phép **đính kèm bằng chứng** (ảnh chụp màn hình).
- Hiển thị **trạng thái báo cáo** của mình: PENDING / RESOLVED / DISMISSED.
- **Rate limiting:** tối đa 5 report/ngày/user để chống lạm dụng.

### Giai đoạn 2 — Workflow & Auto-moderation (Trung hạn)
- **Auto-hide listing** khi nhận ≥ N báo cáo (VD: 5 report → auto-hide).
- **Priority queue:** báo cáo "Lừa đảo" ưu tiên cao hơn "Spam".
- **Reporter feedback:** email thông báo cho reporter khi report được xử lý.
- **Duplicate detection:** gom nhóm các report cùng target.

### Giai đoạn 3 — AI & Analytics (Dài hạn)
- **AI content moderation:** tự động phát hiện nội dung vi phạm (ảnh, text).
- **Report analytics dashboard:** thống kê trend vi phạm, top offenders.
- **Community moderation:** cho phép user đáng tin cậy vote trên reports.
- **Appeal system:** cho phép target gửi kháng cáo.
