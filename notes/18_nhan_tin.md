# Nhắn Tin (Send & View Messages)

## Nhóm chức năng
Nhắn tin & Chat (Chat) — Vai trò: **Người dùng (User)**

## Tên cụ thể của chức năng
Xem và gửi tin nhắn trong hội thoại:
- `GET /api/v1/chat/conversations` — danh sách hội thoại
- `GET /api/v1/chat/conversations/{id}` — chi tiết 1 hội thoại + messages
- `POST /api/v1/chat/messages` — gửi tin nhắn
- `DELETE /api/v1/chat/messages/{id}` — xóa tin nhắn

## Cách mà nó nhận dữ liệu từ Client
- **GET conversations:** Bearer token → list conversations của user.
- **GET conversation/{id}:** Bearer token + path param → messages + participants.
- **POST message:** Bearer token + JSON `{ conversation_id: UUID, content: string }`.
- **DELETE message:** Bearer token + path param `message_id`.

## Cách mà nó xử lí dữ liệu và tương tác cập nhật dữ liệu vào database
- **List conversations:** JOIN conversation_participant → filter by user.id → eager load participants.profile + messages.sender.profile.
- **Get conversation:** Load by id → verify user is participant (403 nếu không).
- **Send message:** Verify participant → ensure_not_blocked → INSERT message → eager load sender.
- **Delete message:** Verify sender_id == user.id → soft_delete() → deleted_at = now.

## Cách mà luồng Backend hoạt động
```
Send message:
  POST /chat/messages + Bearer + JSON
    → get_conversation_or_error(conv_id) → load conversation
    → verify user in conversation.participants
    → ensure_not_blocked() per other participant
    → Message(conversation_id, sender_id, content) → INSERT
    → session.commit()
    → reload with sender.profile → HTTP 201 + MessageRead
```

## Cách mà lập trình mạng được áp dụng vào chức năng
- **REST polling:** Frontend poll mỗi 5 giây bằng GET conversation/{id} — HTTP long polling pattern.
- **Soft delete:** DELETE message → 204 No Content, message bị filter trong queries sau.
- **Nested JSON:** Messages chứa sender object với profile.

## Thiết kế hướng đối tượng của chức năng này thể hiện, ứng dụng ở phần nào
- **`Message` model** — `SoftDeleteMixin` cho xóa mềm.
- **`Conversation` → `Message`** — **Composition** (One-to-Many, cascade delete-orphan).
- **Access control:** Chỉ participants xem conversation, chỉ sender xóa message — **RBAC** cấp entity.
- **Eager loading chain:** `Message → sender → profile` — **Object Graph Navigation**.

## Cách mà Frontend tương tác với Backend để cập nhật giao diện trên màn hình người dùng
1. **Inbox layout:** 2 cột — danh sách conversations (trái) + chat area (phải).
2. **Danh sách:** Hiển thị avatar, tên, last message preview, thời gian tương đối, unread styling.
3. **Search:** Filter conversations theo tên/tiêu đề trong memory.
4. **Chat area:** Message bubbles (sent=xanh phải, received=xám trái) + timestamp + sender avatar.
5. **Date separators:** "Thứ Hai, 14 tháng 4" giữa các ngày khác nhau.
6. **Auto-refresh:** `setInterval` 5 giây → GET conversation/{id} → update messages.
7. **Auto-scroll:** `chatEndRef.scrollIntoView({behavior: "smooth"})` khi messages thay đổi.
8. **Send:** Enter (hoặc click "Gửi") → POST message → clear input → refresh conversation.

## Lộ trình phát triển

### Giai đoạn 1 — WebSocket Real-time (Ngắn hạn)
- Chuyển từ **REST polling** sang **WebSocket** — tin nhắn real-time, không lag.
- **Unread count** badge trên NavBar + danh sách conversations.
- **Online status:** hiển thị dot xanh khi user đang online.
- Thêm **emoji picker** khi soạn tin nhắn.
- **Message reactions** (👍 ❤️ 😂) — react nhanh cho tin nhắn.

### Giai đoạn 2 — Rich Messages & Media (Trung hạn)
- Gửi **ảnh, video, file** (upload + preview inline).
- **Voice message** — ghi âm và gửi audio clip.
- **Link preview** — tự động render Open Graph preview cho URL.
- **Reply/Quote** — trả lời cụ thể 1 tin nhắn.
- **Forward message** — chuyển tiếp tin nhắn sang conversation khác.
- **Message search** — tìm kiếm trong lịch sử tin nhắn.

### Giai đoạn 3 — End-to-End Encryption & AI (Dài hạn)
- **E2E encryption** — mã hóa đầu-cuối cho tin nhắn.
- **Message scheduling:** hẹn giờ gửi tin nhắn.
- **AI-powered spam detection:** tự động phát hiện tin rác/lừa đảo.
- **Chatbot integration:** bot tự trả lời FAQ khi seller offline.
- **Push notifications** (Firebase FCM / APNs) cho mobile.
