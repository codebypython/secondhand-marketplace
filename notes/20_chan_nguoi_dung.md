# Chặn Người Dùng (Block User)

## Nhóm chức năng
Kiểm duyệt & An toàn (Moderation) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Chặn và xem danh sách người dùng bị chặn:
- `POST /api/v1/moderation/blocks` — chặn người dùng
- `GET /api/v1/moderation/blocks` — xem danh sách đã chặn

## Cách mà nó nhận dữ liệu từ Client
- **POST:** Bearer token + JSON `{ blocked_id: UUID }`.
- **GET:** Bearer token, không có params.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **Block:** Kiểm tra self-block → kiểm tra existing block → INSERT INTO blocks(blocker_id, blocked_id).
- **List blocks:** `SELECT FROM blocks WHERE blocker_id = user.id`.
- **Impact:** Khi bị chặn, `ensure_not_blocked()` ngăn: gửi tin nhắn, tạo conversation, gửi offer.

## Cách mà luồng Backend hoạt động
```
POST /moderation/blocks + Bearer + JSON
  → block_user(session, blocker, payload)
    → blocker.id == blocked_id? → raise "cannot block yourself"
    → SELECT Block WHERE blocker_id AND blocked_id → kiểm tra existing
    → existing? → return existing (idempotent)
    → Block(blocker_id, blocked_id) → INSERT
    → session.commit() → HTTP 201

ensure_not_blocked() check (used by chat + transactions):
  → SELECT Block WHERE (A→B) OR (B→A)
  → found? → raise "Interaction is blocked"
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **Idempotent POST:** Block lại user đã chặn → trả về block existing, không tạo duplicate.
- **UniqueConstraint:** `(blocker_id, blocked_id)` → database-level uniqueness.
- **Bidirectional check:** Block A→B cũng chặn B→A.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Block` model** — `UniqueConstraint` + `CheckConstraint` — database-level invariants.
- **`ensure_not_blocked()`** — **Cross-cutting concern** shared giữa chat + transactions.
- **Bidirectional block:** `OR` query kiểm tra cả 2 chiều — **Graph relationship** pattern.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. Trang moderation hoặc profile → nút "Chặn người dùng".
2. Nhập user ID → `api.blockUser(token, { blocked_id })`.
3. Sau khi chặn, mọi tương tác (chat, offer) với user đó sẽ bị từ chối.

## Lộ trình phát triển

### Giai đoạn 1 — Quản lý Danh sách Chặn (Ngắn hạn)
- Tạo trang **"Danh sách chặn"** trong profile: hiển thị user đã chặn + nút bỏ chặn.
- **Unblock function:** `DELETE /moderation/blocks/{block_id}`.
- Nút **"Chặn"** trên trang **hồ sơ công khai** của user.
- Hiển thị **cảnh báo** khi cố tương tác với user đã bị chặn.

### Giai đoạn 2 — Hide & Mute (Trung hạn)
- **Mute (tắt tiếng):** ẩn tin đăng của user khỏi feed mà không block hoàn toàn.
- **Hide listings:** sản phẩm của user bị block biến mất khỏi trang chủ.
- **Block notification:** thông báo cho admin nếu 1 user bị block bởi ≥ N người.
- **Temporary block:** chặn tạm thời (VD: 7 ngày) rồi tự hết hạn.

### Giai đoạn 3 — Fraud Detection & Network (Dài hạn)
- **Block network analysis:** phát hiện user bị block nhiều (potential scammer).
- **Auto-ban:** tự động ban user bị block bởi ≥ 10 người khác nhau.
- **IP/Device blocking:** chặn theo IP hoặc fingerprint device.
- **Block reason tracking:** ghi lại lý do chặn cho mỗi trường hợp.
