# Tạo Cuộc Hội Thoại (Create Conversation)

## Nhóm chức năng
Nhắn tin & Chat (Chat) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Tạo cuộc hội thoại mới (`POST /api/v1/chat/conversations`)

## Cách mà nó nhận dữ liệu từ Client
- HTTP POST + Bearer token + JSON: `{ participant_ids: UUID[], listing_id?: UUID, title?: string }`.
- `participant_ids` là array UUID người tham gia (ngoài người tạo).
- `listing_id` liên kết conversation với sản phẩm (tùy chọn).

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
1. **Deduplicate participants:** `[user.id, ...payload.participant_ids]` — tự động thêm người tạo.
2. **Load participants:** `SELECT FROM users WHERE id IN (?)` → verify tất cả tồn tại.
3. **Block check:** `ensure_not_blocked()` cho mỗi participant ≠ creator.
4. **Listing validation:** Nếu có listing_id → kiểm tra listing tồn tại + owner phải là participant.
5. **Tạo conversation:** INSERT vào `conversations` + INSERT vào `conversation_participant` (M2M).
6. **Commit + reload:** Eager load participants + messages.

## Cách mà luồng Backend hoạt động
```
POST /chat/conversations + Bearer + JSON
  → authenticate → create_conversation(session, user, payload)
    → deduplicate participant IDs
    → SELECT users WHERE id IN (...) → verify existence
    → ensure_not_blocked() per participant
    → optional: verify listing + owner in participants
    → Conversation(title, listing_id) → INSERT
    → conversation.participants = [User, ...] → M2M association
    → session.commit() → reload with eager load → HTTP 201
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **POST** → 201 Created cho resource mới.
- **UUID array** trong JSON body cho multi-participant.
- **M2M association table** `conversation_participant(conversation_id, user_id)`.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **Many-to-Many:** `Conversation ↔ User` qua `conversation_participant` — **Association pattern**.
- **`Conversation` model** có: `participants` (M2M), `messages` (One-to-Many), `listing` (FK) — **Aggregate Root**.
- **Block check** qua `ensure_not_blocked()` — **Cross-cutting concern** (moderation logic used in chat).
- **SoftDeleteMixin** trên Conversation + Message — reuse mixin.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. **Từ listing detail:** Click "💬 Nhắn tin" → `api.createConversation(token, { participant_ids: [owner_id], listing_id, title: "Hỏi về: ..." })` → redirect `/inbox`.
2. **Từ inbox:** Click "＋ Mới" → form nhập participant ID + listing ID + title → `api.createConversation()`.
3. Conversation mới xuất hiện ở đầu danh sách bên trái.
4. Auto-select conversation mới → ready to chat.

## Lộ trình phát triển

### Giai đoạn 1 — UX Cải thiện (Ngắn hạn)
- **Tìm user theo email/tên** thay vì nhập UUID.
- **Prevent duplicate:** kiểm tra conversation đã tồn tại = tự mở thay vì tạo mới.
- Thêm **conversation avatar** auto-generated từ participants.
- **Typing indicator** — hiển thị "đang nhập..." khi đối phương gõ.

### Giai đoạn 2 — Group Chat & Media (Trung hạn)
- **Group chat:** hỗ trợ >2 người (VD: buyer + seller + shipper).
- **Gửi ảnh/video** trong conversation (media messages).
- **Conversation settings:** đổi tên, thêm/xóa participant, mute/unmute.
- **Pin message** — ghim tin nhắn quan trọng.
- **Read receipts** — đánh dấu đã đọc (✓✓).

### Giai đoạn 3 — AI & Smart Chat (Dài hạn)
- **Chatbot assistant:** trợ lý AI gợi ý câu trả lời cho seller.
- **Auto-translate:** dịch tin nhắn giữa các ngôn ngữ.
- **Smart reply suggestions:** gợi ý phản hồi nhanh.
- **Chat analytics:** thống kê thời gian phản hồi, conversation volume.
