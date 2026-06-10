"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, MessageCircle, Video, Phone, PhoneOff, Image } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";
import Link from "next/link";
import { getInitials, timeAgo, formatPrice } from "@/lib/utils";

export default function InboxPage() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchConv, setSearchConv] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [listingId, setListingId] = useState("");
  const [title, setTitle] = useState("");

  // WebSocket and WebRTC Refs & States
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<any[]>([]);

  const [callActive, setCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callerName, setCallerName] = useState("");
  const [callSDP, setCallSDP] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCameraWarning, setShowCameraWarning] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [listingDetail, setListingDetail] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected?.listing_id) {
      setListingDetail(null);
      return;
    }
    setLoadingListing(true);
    api.getListing(selected.listing_id)
      .then((detail) => {
        setListingDetail(detail);
      })
      .catch((err) => {
        console.error("Failed to load listing detail for sidebar:", err);
      })
      .finally(() => {
        setLoadingListing(false);
      });
  }, [selected?.listing_id]);

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

  const cleanupCall = () => {
    setCallActive(false);
    setIsIncomingCall(false);
    setCallerId(null);
    setCallSDP(null);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidatesQueue.current = [];
  };

  // Establish WebSocket connection
  useEffect(() => {
    if (!token) return;

    let wsUrl = "";
    if (process.env.NEXT_PUBLIC_API_URL) {
      const wsBase = process.env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws");
      wsUrl = `${wsBase}/chat/ws/${token}`;
    } else if (typeof window !== "undefined") {
      const isSecure = window.location.protocol === "https:";
      const wsProtocol = isSecure ? "wss:" : "ws:";
      if (isSecure) {
        wsUrl = `${wsProtocol}//${window.location.host}/api/v1/chat/ws/${token}`;
      } else {
        wsUrl = `${wsProtocol}//${window.location.hostname}:8000/api/v1/chat/ws/${token}`;
      }
    } else {
      wsUrl = `ws://localhost:8000/api/v1/chat/ws/${token}`;
    }

    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully.");
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        if (data.type === "chat_message") {
          const newMsg = data.message;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                // Filter out the temp optimistic message for this content
                const filtered = c.messages.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content));
                const exists = filtered.some((m) => m.id === newMsg.id);
                return {
                  ...c,
                  messages: exists 
                    ? filtered.map(m => m.id === newMsg.id ? newMsg : m)
                    : [...filtered, newMsg],
                };
              }
              return c;
            })
          );
          
          // Auto-mark as read if we are looking at this conversation
          if (selectedId === newMsg.conversation_id && newMsg.sender_id !== user?.id) {
            ws.send(JSON.stringify({
              type: "read_conversation",
              conversation_id: selectedId
            }));
          }
        } else if (data.type === "messages_read") {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === data.conversation_id) {
                return {
                  ...c,
                  messages: c.messages.map((m) => 
                    m.sender_id !== data.reader_id ? { ...m, status: "read" } : m
                  )
                };
              }
              return c;
            })
          );
        } else if (data.type === "rtc_offer") {
          setCallerId(data.sender_user_id);
          setCallerName("Đối tác gọi video");
          setCallSDP(data.sdp);
          setIsIncomingCall(true);
        } else if (data.type === "rtc_answer") {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            while (iceCandidatesQueue.current.length > 0) {
              const cand = iceCandidatesQueue.current.shift();
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (data.type === "rtc_ice_candidate") {
          const cand = data.candidate;
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
          } else {
            iceCandidatesQueue.current.push(cand);
          }
        } else if (data.type === "rtc_hangup") {
          cleanupCall();
        }
      } catch (err) {
        console.error("Error processing ws message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    ws.onerror = (err) => {
      console.warn("WebSocket connection error:", err);
    };


    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);

  // Send read receipt when selecting conversation, or when a new message arrives
  useEffect(() => {
    if (!selectedId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: "read_conversation",
      conversation_id: selectedId
    }));
  }, [selectedId, selected?.messages.length]);

  const startCall = async () => {
    if (!selected || !wsRef.current) return;

    if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setShowCameraWarning(true);
      return;
    }

    const otherParticipant = selected.participants.find((p) => p.id !== user?.id);
    if (!otherParticipant) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallActive(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "rtc_ice_candidate",
            target_user_id: otherParticipant.id,
            candidate: event.candidate
          }));
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: "rtc_offer",
        target_user_id: otherParticipant.id,
        sdp: offer
      }));
    } catch (err) {
      console.error("Failed to start call:", err);
      showToast("Không thể khởi động camera/micro: " + (err instanceof Error ? err.message : ""), "danger");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!callerId || !callSDP || !wsRef.current) return;
    setIsIncomingCall(false);

    if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setShowCameraWarning(true);
      rejectCall();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallActive(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: "rtc_ice_candidate",
            target_user_id: callerId,
            candidate: event.candidate
          }));
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callSDP));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsRef.current.send(JSON.stringify({
        type: "rtc_answer",
        target_user_id: callerId,
        sdp: answer
      }));

      while (iceCandidatesQueue.current.length > 0) {
        const cand = iceCandidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      }
    } catch (err) {
      console.error("Failed to accept call:", err);
      showToast("Không thể khởi động camera/micro: " + (err instanceof Error ? err.message : ""), "danger");
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (callerId && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "rtc_hangup",
        target_user_id: callerId
      }));
    }
    cleanupCall();
  };

  const endCall = () => {
    if (!selected || !wsRef.current) {
      cleanupCall();
      return;
    }
    const otherParticipant = selected.participants.find((p) => p.id !== user?.id);
    if (otherParticipant) {
      wsRef.current.send(JSON.stringify({
        type: "rtc_hangup",
        target_user_id: otherParticipant.id
      }));
    }
    cleanupCall();
  };

  if (!token) {
    return (
      <PageShell title="Hộp thư">
        <div className="panel"><p className="muted">Vui lòng đăng nhập để xem tin nhắn.</p></div>
      </PageShell>
    );
  }

  const filteredConversations = searchConv
    ? conversations.filter((c) => {
        const title = c.title?.toLowerCase() ?? "";
        const names = c.participants.map((p) => p.profile?.full_name?.toLowerCase() ?? p.email.toLowerCase()).join(" ");
        return title.includes(searchConv.toLowerCase()) || names.includes(searchConv.toLowerCase());
      })
    : conversations;

  const handleSend = async () => {
    if (!selected || !messageText.trim() || !user?.id) return;
    setSending(true);
    
    // Create optimistic message
    const tempId = "temp-" + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: selected.id,
      sender_id: user.id,
      content: messageText,
      status: "sending",
      created_at: new Date().toISOString(),
      sender: user as any
    };
    
    // Optimistically add to message list
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === selected.id) {
          return {
            ...c,
            messages: [...c.messages, optimisticMsg]
          };
        }
        return c;
      })
    );
    
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "chat_message",
          conversation_id: selected.id,
          content: messageText
        }));
        setMessageText("");
      } else {
        const res = await api.sendMessage(token, { conversation_id: selected.id, content: messageText }) as any;
        setMessageText("");
        // Replace temp message with server message
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === selected.id) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === tempId ? res : m)
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      // Remove temp message on error
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === selected.id) {
            return {
              ...c,
              messages: c.messages.filter(m => m.id !== tempId)
            };
          }
          return c;
        })
      );
      showToast(err instanceof Error ? err.message : "Không thể gửi tin nhắn.", "danger");
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    try {
      const res = await api.uploadMedia(token, file);
      const imageUrl = `![IMAGE](${res.url})`;
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "chat_message",
          conversation_id: selected.id,
          content: imageUrl
        }));
      } else {
        await api.sendMessage(token, { conversation_id: selected.id, content: imageUrl });
        const updated = await api.getConversation(token, selected.id);
        setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      }
      showToast("Đã gửi hình ảnh thành công!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể gửi hình ảnh.", "danger");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Bạn có muốn thu hồi tin nhắn này không?")) return;
    try {
      await api.deleteMessage(token, messageId);
      showToast("Đã thu hồi tin nhắn.", "success");
      if (selectedId) {
        const updated = await api.getConversation(token, selectedId);
        setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể thu hồi tin nhắn.", "danger");
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
      <div className="grid two" style={{ gridTemplateColumns: showSidebar ? "340px 1fr 300px" : "340px 1fr", minHeight: 560, transition: "grid-template-columns 250ms ease" }}>
        {/* Left: Conversation list */}
        <div className="inbox-section" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
          <div className="inbox-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={18} />
              <span>Hội thoại</span>
            </div>
            <button className="button ghost sm" type="button" onClick={() => setShowCreate(!showCreate)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {showCreate ? <X size={16} /> : <Plus size={16} />}
              {showCreate ? "Hủy" : "Mới"}
            </button>
          </div>
          <input
            className="inbox-search"
            placeholder="🔍 Tìm kiếm hội thoại..."
            value={searchConv}
            onChange={(e) => setSearchConv(e.target.value)}
          />

          {showCreate ? (
            <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
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
              <div className="inbox-empty">
                <div style={{ fontSize: 24 }}><MessageCircle size={40} style={{ color: "var(--text-tertiary)", margin: "0 auto" }} /></div>
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
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {selected.participants.some((p) => p.id !== user?.id) && (
                    <button 
                      className="button secondary sm" 
                      type="button"
                      onClick={startCall} 
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                      title="Gọi video WebRTC"
                    >
                      <Video size={16} /> Gọi Video
                    </button>
                  )}
                  <button
                    className={`button ${showSidebar ? "primary" : "secondary"} sm`}
                    type="button"
                    onClick={() => setShowSidebar(!showSidebar)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 0 }}
                    title="Thông tin cuộc hội thoại"
                  >
                    ❗
                  </button>
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
                      const isImg = msg.content.startsWith("![IMAGE]");

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
                            <div style={{ display: "flex", flexDirection: "column", alignItems: isSent ? "flex-end" : "flex-start" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {isSent && msg.content !== "Tin nhắn đã bị thu hồi" && (
                                  <button
                                    title="Thu hồi tin nhắn"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--text-tertiary)",
                                      cursor: "pointer",
                                      fontSize: 12,
                                      opacity: 0.5,
                                      padding: 2,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                                  >
                                    🗑️
                                  </button>
                                )}
                                <div 
                                  className={`message-bubble ${isSent ? "sent" : "received"}`} 
                                  style={{ 
                                    fontStyle: msg.content === "Tin nhắn đã bị thu hồi" ? "italic" : "normal", 
                                    color: msg.content === "Tin nhắn đã bị thu hồi" ? "var(--text-tertiary)" : "inherit",
                                    padding: isImg ? "6px" : undefined
                                  }}
                                >
                                  {isImg ? (
                                    <img 
                                      src={msg.content.match(/\((.*?)\)/)?.[1] || ""} 
                                      alt="Shared image" 
                                      style={{ maxWidth: "250px", maxHeight: "250px", borderRadius: "8px", display: "block" }} 
                                    />
                                  ) : (
                                    msg.content
                                  )}
                                </div>
                              </div>
                              <div className="message-meta" style={{ display: "flex", alignItems: "center", justifyContent: isSent ? "flex-end" : "flex-start", gap: 4, paddingLeft: 4, paddingRight: 4 }}>
                                <span>{new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                {isSent && (
                                  <>
                                    {msg.status === "sending" && <span style={{ fontSize: 9, color: "var(--text-tertiary)" }} title="Đang gửi">⏳</span>}
                                    {msg.status === "sent" && <span style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: "bold" }} title="Đã gửi">✓</span>}
                                    {msg.status === "delivered" && <span style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: "bold" }} title="Đã nhận">✓✓</span>}
                                    {msg.status === "read" && <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: "bold" }} title="Đã xem">✓✓</span>}
                                  </>
                                )}
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
              <div className="chat-input-area" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
                <label 
                  style={{ 
                    cursor: uploadingImage ? "not-allowed" : "pointer", 
                    opacity: uploadingImage ? 0.5 : 1, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    padding: 8,
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--bg-inset)"
                  }}
                  title="Gửi hình ảnh"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleSendImage} 
                    disabled={uploadingImage} 
                    style={{ display: "none" }} 
                  />
                  <Image size={18} />
                </label>
                <textarea
                  placeholder={uploadingImage ? "Đang tải ảnh..." : "Nhập tin nhắn... (Enter để gửi)"}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={uploadingImage}
                  rows={1}
                  style={{ minHeight: 40, maxHeight: 100, flex: 1, resize: "none" }}
                />
                <button className="button primary sm" type="button" onClick={handleSend} disabled={sending || uploadingImage || !messageText.trim()}>
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

        {/* Sidebar container */}
        {showSidebar && selected && (
          <div
            className="panel"
            style={{
              borderLeft: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto",
              width: 300,
              flexShrink: 0
            }}
          >
            {/* Header */}
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              Thông tin hội thoại
            </h3>
            
            {/* Partner Details */}
            {(() => {
              const partner = selected.participants.find((p) => p.id !== user?.id);
              if (!partner) return <p className="muted">Không có thông tin đối tác.</p>;
              const partnerName = partner.profile?.display_name || partner.profile?.full_name || partner.email;
              const initials = getInitials(partner.profile?.full_name, partner.email?.[0]?.toUpperCase());
              
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      backgroundColor: "var(--accent)", color: "var(--text-inverse)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 700, overflow: "hidden"
                    }}>
                      {partner.profile?.avatar_url ? (
                        <img src={partner.profile.avatar_url} alt="Partner avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : initials}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{partnerName}</h4>
                      {partner.profile?.shop_slug && (
                        <span className="muted" style={{ fontSize: 12 }}>@{partner.profile.shop_slug}</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div><strong>Giới thiệu:</strong> <p className="muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{partner.profile?.bio || "Không có giới thiệu."}</p></div>
                    <div><strong>Tham gia:</strong> <span className="muted">{new Date(partner.created_at).toLocaleDateString("vi-VN")}</span></div>
                  </div>
                  
                  <Link
                    className="button primary sm"
                    href={`/users/${partner.id}`}
                    style={{ textAlign: "center", width: "100%", display: "block", fontSize: 12 }}
                  >
                    🏪 Ghé xem Shop
                  </Link>
                </div>
              );
            })()}
            
            <div className="divider" style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
            
            {/* Statistics */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Thống kê tương tác</h4>
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="split">
                  <span className="muted">Bắt đầu:</span>
                  <span>{new Date(selected.created_at).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="split">
                  <span className="muted">Tổng số tin:</span>
                  <span className="badge">{selected.messages.length}</span>
                </div>
              </div>
            </div>
            
            {/* Listing Details */}
            {selected.listing_id && (
              <>
                <div className="divider" style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Sản phẩm quan tâm</h4>
                  {loadingListing ? (
                    <div className="skeleton" style={{ height: 80 }} />
                  ) : listingDetail ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {listingDetail.image_urls?.[0] && (
                        <img src={listingDetail.image_urls[0]} alt={listingDetail.title} style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover" }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/listings/${listingDetail.id}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none", display: "block" }} className="truncate">
                          {listingDetail.title}
                        </Link>
                        <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
                          {formatPrice(listingDetail.price)} ₫
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: 12 }}>Sản phẩm không hoạt động.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* WebRTC Video Call Overlay Modal */}
      {callActive && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(12px)",
          zIndex: 9999, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "white", padding: 20
        }}>
          <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "white", margin: 0 }}>📞 Cuộc gọi Video WebRTC</h2>
              <span style={{ fontSize: 11, background: "var(--success)", color: "white", padding: "4px 8px", borderRadius: 4, fontWeight: "bold" }}>
                LAN P2P
              </span>
            </div>
            
            <div className="grid two" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Local Stream */}
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#1e293b", height: 350 }}>
                <video 
                  ref={(el) => { if (el) el.srcObject = localStream; }} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
                />
                <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                  Bạn (Local camera)
                </div>
              </div>
              
              {/* Remote Stream */}
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#1e293b", height: 350 }}>
                {remoteStream ? (
                  <video 
                    ref={(el) => { if (el) el.srcObject = remoteStream; }} 
                    autoPlay 
                    playsInline 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                    <div className="spinner" style={{ marginBottom: 15 }} />
                    <span>Đang chờ đối phương kết nối...</span>
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                  Đối tác (Remote video)
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 15, marginTop: 10 }}>
              <button className="button danger" onClick={endCall} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px" }}>
                <PhoneOff size={18} /> Gác máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call Ringing Overlay */}
      {isIncomingCall && (
        <div style={{
          position: "fixed", top: 20, right: 20, width: 320,
          background: "var(--bg-card)", border: "2px solid var(--primary)",
          borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          zIndex: 10000, padding: 16, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              📞
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{callerName}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Cuộc gọi video tới...</div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="button secondary sm" onClick={rejectCall}>Từ chối</button>
            <button className="button primary sm" onClick={acceptCall} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={14} /> Trả lời
            </button>
          </div>
        </div>
      )}

      {/* Camera warning modal for insecure context */}
      {showCameraWarning && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)",
          zIndex: 10001, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "white", padding: 20
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 550, border: "1px solid var(--warning)", background: "var(--bg-card)", margin: 0 }}>
            <h2 className="card-title" style={{ borderLeftColor: "var(--warning)", color: "var(--warning)" }}>
              ⚠️ Thiết Bị Không Hỗ Trợ Camera (HTTP LAN)
            </h2>
            <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 14, fontSize: 14, color: "var(--text)" }}>
              <p>Trình duyệt của bạn chặn quyền truy cập Camera/Microphone qua giao thức kết nối HTTP không bảo mật.</p>
              
              <div style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)", padding: 12, borderRadius: 8 }}>
                <strong style={{ color: "var(--warning)" }}>Cách khắc phục 1 (Khuyên dùng):</strong>
                <p style={{ marginTop: 4 }}>Sử dụng địa chỉ <strong>localhost</strong> thay vì IP LAN để truy cập:</p>
                <code style={{ display: "block", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 4, margin: "6px 0", color: "#fbbf24" }}>
                  http://localhost:3000 (hoặc cổng 3001)
                </code>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", padding: 12, borderRadius: 8 }}>
                <strong>Cách khắc phục 2 (Cho IP LAN):</strong>
                <ol style={{ paddingLeft: 16, marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>Sao chép đường dẫn: <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                  <li>Dán vào thanh địa chỉ trình duyệt Chrome/Edge của bạn.</li>
                  <li>Thêm địa chỉ IP LAN hiện tại (ví dụ: <code>http://192.168.1.5:3000</code>) vào ô danh sách.</li>
                  <li>Chọn <strong>Enabled</strong>, nhấn <strong>Relaunch</strong> trình duyệt để áp dụng.</li>
                </ol>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="button primary" onClick={() => setShowCameraWarning(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
