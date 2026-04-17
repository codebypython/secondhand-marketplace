# Xem Xét Báo Cáo — Admin (Review Reports)

## Nhóm chức năng
Kiểm duyệt & An toàn (Moderation) — Vai trò: **Quản trị viên (Admin)**

## Tên cụ thể của chức năng
Xem danh sách và xử lý báo cáo vi phạm:
- `GET /api/v1/moderation/reports` — danh sách tất cả báo cáo (Admin only)
- `PATCH /api/v1/moderation/reports/{report_id}` — xử lý báo cáo (Admin only)

## Cách mà nó nhận dữ liệu từ Client
- **GET:** Bearer token (phải là ADMIN) → trả về toàn bộ reports.
- **PATCH:** Bearer token (ADMIN) + path param `report_id` + JSON `{ status: "RESOLVED"|"DISMISSED" }`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **List:** `SELECT FROM reports ORDER BY created_at DESC` — Admin xem tất cả.
- **Review:** Load report → verify admin role → update `report.status` → commit.
- Không cho phép set status về PENDING.

## Cách mà luồng Backend hoạt động
```
PATCH /moderation/reports/{id} + Admin Bearer + JSON
  → get_admin_user() → verify role == ADMIN (403 nếu không)
  → review_report(session, admin, report_id, payload)
    → session.get(Report, report_id) → load report
    → payload.status == PENDING? → raise error
    → report.status = payload.status → UPDATE
    → session.commit() → HTTP 200 + ReportRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **RBAC (Role-Based Access Control):** `get_admin_user()` dependency kiểm tra role.
- **HTTP PATCH** — partial update cho status field.
- **Chain Dependency:** `get_admin_user` → `get_current_user` → `HTTPBearer` — 3 layers.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`get_admin_user()`** depends on `get_current_user()` — **Decorator pattern** thêm authorization layer.
- **`ReportReview` schema** — restricted DTO chỉ cho phép thay đổi `status`.
- **Enum validation:** `ReportStatus` — type-safe state transitions.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. NavBar chỉ hiển thị link "Moderation" nếu `user.role === "ADMIN"`.
2. Trang `/moderation` mount → `api.listReports(token)` → GET reports.
3. Hiển thị bảng: reporter, target type/id, reason, status badge, thời gian.
4. Admin click "Resolve" hoặc "Dismiss" → `api.reviewReport(token, report_id, { status })`.
5. Badge cập nhật: PENDING (vàng) → RESOLVED (xanh) / DISMISSED (xám).

## Lộ trình phát triển

### Giai đoạn 1 — Admin Dashboard Cải tiến (Ngắn hạn)
- **Filter/Sort:** lọc theo status, target_type, ngày, mức độ nghiêm trọng.
- **Xem chi tiết target:** click report → popup hiển thị listing/user bị báo cáo.
- **Batch review:** chọn nhiều report → resolve/dismiss hàng loạt.
- **Admin notes:** thêm ghi chú nội bộ cho mỗi report.

### Giai đoạn 2 — Actions & Penalties (Trung hạn)
- **Ban user** trực tiếp từ report review (ACTIVE → BANNED).
- **Hide/Delete listing** khi resolve report vi phạm.
- **Warning system:** gửi cảnh báo cho user trước khi ban (3 strikes).
- **Moderation log:** audit trail đầy đủ (admin nào xử lý, lúc nào, action gì).
- **SLA tracking:** theo dõi thời gian xử lý trung bình.

### Giai đoạn 3 — AI & Team Management (Dài hạn)
- **AI pre-classification:** tự động phân loại report (spam/fraud/inappropriate).
- **Moderator roles:** phân quyền nhiều cấp (Junior/Senior Moderator, Super Admin).
- **Moderation analytics:** dashboard KPIs — số report/ngày, resolution time, appeal rate.
- **Escalation system:** tự động chuyển report nghiêm trọng cho admin cấp cao.
