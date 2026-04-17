"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { getInitials, timeAgo } from "@/lib/utils";

export default function InboxPage() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchConv, setSearchConv] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Create conversation form
  const [showCreate, setShowCreate] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [listingId, setListingId] = useState("");
  const [title, setTitle] = useState("");

  const reload = async () => {
    if (!token) return;
    const items = await api.listConversations(token);
    setConversations(items);
    setSelectedId((current) => current || items[0]?.id || "");
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api.listConversations(token).then((items) => {
      if (!active) return;
      setConversations(items);
      setSelectedId((current) => current || items[0]?.id || "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, conversations]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!token || !selectedId) return;
    const interval = setInterval(() => {
      void api.getConversation(token, selectedId).then((conv) => {
        setConversations((prev) => prev.map((c) => c.id === conv.id ? conv : c));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [token, selectedId]);

  if (!token) {
    return (
      <PageShell title="Hộp thư">
        <div className="panel"><p className="muted">Vui lòng đăng nhập để xem tin nhắn.</p></div>
      </PageShell>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const filteredConversations = searchConv
    ? conversations.filter((c) => {
        const title = c.title?.toLowerCase() ?? "";
        const names = c.participants.map((p) => p.profile?.full_name?.toLowerCase() ?? p.email.toLowerCase()).join(" ");
        return title.includes(searchConv.toLowerCase()) || names.includes(searchConv.toLowerCase());
      })
    : conversations;

  const handleSend = async () => {
    if (!selected || !messageText.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(token, { conversation_id: selected.id, content: messageText });
      setMessageText("");
      // Refresh just this conversation
      const updated = await api.getConversation(token, selected.id);
      setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể gửi tin nhắn.", "danger");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreate = async () => {
    try {
      const conv = await api.createConversation(token, {
        participant_ids: participantId ? [participantId] : [],
        listing_id: listingId || undefined,
        title: title || undefined,
      });
      showToast("Đã tạo cuộc hội thoại!", "success");
      setShowCreate(false);
      setParticipantId(""); setListingId(""); setTitle("");
      await reload();
      setSelectedId(conv.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể tạo cuộc hội thoại.", "danger");
    }
  };

  return (
    <PageShell title="Hộp thư" description="Nhắn tin với người mua và người bán">
      <div className="grid two" style={{ gridTemplateColumns: "340px 1fr", minHeight: 560 }}>
        {/* Left: Conversation list */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
            <div className="split" style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>💬 Hội thoại</span>
              <button className="button ghost sm" type="button" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? "✕" : "＋ Mới"}
              </button>
            </div>
            <input
              placeholder="🔍 Tìm kiếm hội thoại..."
              value={searchConv}
              onChange={(e) => setSearchConv(e.target.value)}
              style={{
                width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                padding: "8px 12px", fontSize: 13, background: "var(--bg-inset)", outline: "none",
              }}
            />
          </div>

          {showCreate ? (
            <div style={{ padding: 14, borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="field">
                <label style={{ fontSize: 12 }}>ID người tham gia</label>
                <input placeholder="UUID..." value={participantId} onChange={(e) => setParticipantId(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>ID tin đăng (tùy chọn)</label>
                <input placeholder="UUID..." value={listingId} onChange={(e) => setListingId(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Tiêu đề</label>
                <input placeholder="Chủ đề hội thoại" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              <button className="button primary sm" type="button" onClick={handleCreate}>Tạo hội thoại</button>
            </div>
          ) : null}

          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <div style={{ padding: 16 }}>{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 4, borderRadius: "var(--radius)" }} />)}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <div className="empty-icon">💬</div>
                <h3>{searchConv ? "Không tìm thấy" : "Chưa có hội thoại"}</h3>
                <p>{searchConv ? "Thử tìm kiếm khác" : "Bắt đầu nhắn tin từ trang chi tiết sản phẩm."}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherParticipants = conv.participants.filter((p) => p.id !== user?.id);
                const displayName = otherParticipants.length > 0
                  ? otherParticipants.map((p) => p.profile?.full_name ?? p.email).join(", ")
                  : "Bạn";
                const lastMessage = conv.messages[conv.messages.length - 1];
                const unread = lastMessage && lastMessage.sender_id !== user?.id;
                return (
                  <div
                    key={conv.id}
                    className={`conversation-item${conv.id === selectedId ? " active" : ""}`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <div className="conversation-avatar">
                      {getInitials(otherParticipants[0]?.profile?.full_name, otherParticipants[0]?.email?.[0]?.toUpperCase())}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="truncate" style={{ fontWeight: unread ? 700 : 600, fontSize: 14 }}>
                          {conv.title ?? displayName}
                        </span>
                        {lastMessage ? (
                          <span className="muted" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                            {timeAgo(lastMessage.created_at)}
                          </span>
                        ) : null}
                      </div>
                      {lastMessage ? (
                        <div className="truncate" style={{ fontSize: 12, color: unread ? "var(--text)" : "var(--text-tertiary)", fontWeight: unread ? 500 : 400 }}>
                          {lastMessage.sender_id === user?.id ? "Bạn: " : ""}{lastMessage.content}
                        </div>
                      ) : (
                        <div className="muted" style={{ fontSize: 12 }}>Chưa có tin nhắn</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Chat area */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          {selected ? (
            <>
              {/* Chat header */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="conversation-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                    {getInitials(
                      selected.participants.filter((p) => p.id !== user?.id)[0]?.profile?.full_name,
                      selected.participants.filter((p) => p.id !== user?.id)[0]?.email?.[0]?.toUpperCase(),
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{selected.title ?? "Hội thoại"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {selected.participants.filter((p) => p.id !== user?.id).map((p) => p.profile?.full_name ?? p.email).join(", ") || "Bạn"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-area" style={{ flex: 1, padding: "20px 16px" }}>
                {selected.messages.length === 0 ? (
                  <div className="empty-state" style={{ flex: 1 }}>
                    <div className="empty-icon">👋</div>
                    <h3>Bắt đầu trò chuyện!</h3>
                    <p>Gửi tin nhắn đầu tiên để bắt đầu.</p>
                  </div>
                ) : (
                  <>
                    {selected.messages.map((msg, idx) => {
                      const isSent = msg.sender_id === user?.id;
                      const prevMsg = selected.messages[idx - 1];
                      const showDateSep = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                      const showAvatar = !isSent && (!selected.messages[idx + 1] || selected.messages[idx + 1].sender_id !== msg.sender_id);

                      return (
                        <div key={msg.id}>
                          {showDateSep ? (
                            <div style={{ textAlign: "center", margin: "12px 0", fontSize: 11, color: "var(--text-tertiary)" }}>
                              {new Date(msg.created_at).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                            </div>
                          ) : null}
                          <div style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
                            {!isSent && showAvatar ? (
                              <div style={{
                                width: 28, height: 28, borderRadius: "var(--radius-full)",
                                background: "var(--accent-surface)", color: "var(--accent)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                              }}>
                                {getInitials(msg.sender?.profile?.full_name, msg.sender?.email?.[0]?.toUpperCase())}
                              </div>
                            ) : !isSent ? <div style={{ width: 28 }} /> : null}
                            <div>
                              <div className={`message-bubble ${isSent ? "sent" : "received"}`}>{msg.content}</div>
                              <div className="message-meta" style={{ textAlign: isSent ? "right" : "left", paddingLeft: 4, paddingRight: 4 }}>
                                {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <textarea
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{ minHeight: 40, maxHeight: 100 }}
                />
                <button className="button primary sm" type="button" onClick={handleSend} disabled={sending || !messageText.trim()}>
                  {sending ? "..." : "Gửi →"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-icon">💬</div>
              <h3>Chọn hội thoại</h3>
              <p>Chọn một cuộc hội thoại bên trái để xem tin nhắn.</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
