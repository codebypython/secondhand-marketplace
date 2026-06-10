"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Heart, Send, AlertTriangle, Volume2, VolumeX, MessageSquare, MessageSquareOff, Maximize, Minimize } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Listing } from "@/lib/types";
import WishlistButton from "@/components/product/WishlistButton";
import { showToast } from "@/components/toast";

interface FloatingHeart {
  id: number;
  left: number;
}

export default function LivestreamRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [roomDetail, setRoomDetail] = useState<any>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [isLiveEnded, setIsLiveEnded] = useState(false);

  // Chat States
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  // WebRTC & WebSocket Refs
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const viewerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);

  // Floating Hearts state
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const heartIdRef = useRef(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Controls & Fullscreen & Collapse States
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleToggleFullscreen = () => {
    const container = document.querySelector(".live-player-container");
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // 1. Authenticated check
  useEffect(() => {
    if (!token && !loadingRoom) {
      showToast("Vui lòng đăng nhập để tham gia phòng livestream", "danger");
    }
  }, [token, loadingRoom]);

  // 2. Fetch Room Details, Listings, and comments
  useEffect(() => {
    if (!token || !params.roomId) return;

    setLoadingRoom(true);
    api.getLiveRoom(params.roomId)
      .then((room) => {
        setRoomDetail(room);

        // Fetch streamer's listings
        api.getUserListings(room.user_id)
          .then((listingsData) => {
            setListings(listingsData);
            setLoadingListings(false);
          })
          .catch((err) => {
            console.error("Failed to load listings:", err);
            setLoadingListings(false);
          });

        // Fetch comments
        api.getLiveComments(params.roomId)
          .then((commentsData) => {
            setMessages(commentsData);
          })
          .catch((err) => {
            console.error("Failed to load comments:", err);
          });

        setLoadingRoom(false);
      })
      .catch((err) => {
        console.error("Error loading live room:", err);
        showToast("Phòng livestream không tồn tại hoặc đã bị tắt.", "danger");
        router.push("/livestream");
      });
  }, [token, params.roomId]);

  // 3. WebRTC and WebSocket Connection Logic
  useEffect(() => {
    if (!token || !roomDetail) return;

    const isHost = user?.id === roomDetail.user_id;

    // A. Host media setup
    if (isHost) {
      if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: true
        })
          .then((stream) => {
            localStreamRef.current = stream;
            setLocalStream(stream);
            setHasCameraError(false);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "stream_start",
                listing_id: roomDetail.user_id
              }));
            }
          })
          .catch((err) => {
            console.error("Camera access error:", err);
            setHasCameraError(true);
          });
      } else {
        setHasCameraError(true);
      }
    }

    // B. Socket setup
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
      wsUrl = `ws://127.0.0.1:8000/api/v1/chat/ws/${token}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to livestream room.");
      if (isHost) {
        if (localStreamRef.current) {
          ws.send(JSON.stringify({
            type: "stream_start",
            listing_id: roomDetail.user_id
          }));
        }
      } else {
        ws.send(JSON.stringify({
          type: "stream_join",
          listing_id: roomDetail.user_id,
          broadcaster_id: roomDetail.user_id
        }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        // real-time comments
        if (data.type === "live_comment" && data.listing_id === roomDetail.user_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.comment.id)) return prev;
            return [...prev, data.comment];
          });
        }
        // real-time hearts
        else if (data.type === "live_heart" && data.listing_id === roomDetail.user_id) {
          triggerHeartAnimation();
        }
        // real-time viewer count
        else if (data.type === "live_viewer_count" && data.listing_id === roomDetail.user_id) {
          setViewers(data.count);
        }
        // host disconnect
        else if (data.type === "stream_inactive" && data.broadcaster_id === roomDetail.user_id) {
          if (!isHost) {
            setIsLiveEnded(true);
            showToast("Phòng livestream đã kết thúc.", "default");
          }
        }
        // WebRTC Signaling - streamer perspective
        else if (isHost) {
          if (data.type === "stream_join") {
            const viewerId = data.viewer_id;
            console.log(`Viewer connected: ${viewerId}`);

            const pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
            viewerConnections.current.set(viewerId, pc);

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                viewerConnections.current.delete(viewerId);
                pc.close();
                const count = viewerConnections.current.size;
                setViewers(count);
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: "live_viewer_count",
                    listing_id: roomDetail.user_id,
                    count: count
                  }));
                }
              }
            };

            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
              });
            }

            pc.onicecandidate = (e) => {
              if (e.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({
                  type: "stream_ice",
                  listing_id: roomDetail.user_id,
                  target_id: viewerId,
                  candidate: e.candidate
                }));
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: "stream_offer",
                listing_id: roomDetail.user_id,
                target_id: viewerId,
                sdp: offer
              }));
            }

            // Broadcast real live viewer count
            const count = viewerConnections.current.size;
            setViewers(count);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "live_viewer_count",
                listing_id: roomDetail.user_id,
                count: count
              }));
            }
          }
          else if (data.type === "stream_answer") {
            const pc = viewerConnections.current.get(data.sender_id);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
          }
          else if (data.type === "stream_ice") {
            const pc = viewerConnections.current.get(data.sender_id);
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
          else if (data.type === "stream_leave") {
            const pc = viewerConnections.current.get(data.viewer_id);
            if (pc) {
              pc.close();
              viewerConnections.current.delete(data.viewer_id);
            }
          }
        }
        // WebRTC Signaling - viewer perspective
        else {
          if (data.type === "stream_offer") {
            console.log("Creating viewer connection from offer...");
            const pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
            pcRef.current = pc;

            pc.onicecandidate = (e) => {
              if (e.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({
                  type: "stream_ice",
                  listing_id: roomDetail.user_id,
                  target_id: roomDetail.user_id,
                  candidate: e.candidate
                }));
              }
            };

            pc.ontrack = (e) => {
              console.log("Receiving remote track...");
              setRemoteStream(e.streams[0]);
            };

            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: "stream_answer",
                listing_id: roomDetail.user_id,
                target_id: roomDetail.user_id,
                sdp: answer
              }));
            }
          }
          else if (data.type === "stream_ice") {
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
        }
      } catch (err) {
        console.error("Error processing websocket payload:", err);
      }
    };

    ws.onclose = () => {
      console.log("Livestream WebSocket closed.");
    };

    return () => {
      if (isHost) {
        viewerConnections.current.forEach((pc) => pc.close());
        viewerConnections.current.clear();
      } else {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      ws.close();
    };
  }, [token, roomDetail]);

  if (!token) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "70vh", padding: 24, textAlign: "center", animation: "fadeUp 0.5s ease-out"
      }}>
        <div className="glass-panel" style={{ maxWidth: 450, padding: 32, borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Yêu cầu đăng nhập</h2>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Vui lòng đăng nhập tài khoản của bạn để tham gia xem livestream, trò chuyện trực tiếp và nhận luồng WebRTC thời gian thực từ người bán.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/login" className="button primary sm" style={{ padding: "10px 20px" }}>
              Đăng nhập ngay
            </Link>
            <Link href="/livestream" className="button secondary sm" style={{ padding: "10px 20px" }}>
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadingRoom || !roomDetail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 40, alignItems: "center", justifyContent: "center", height: "50vh" }}>
        <div className="spinner" />
        <span className="muted">Đang kết nối phòng livestream...</span>
      </div>
    );
  }

  const isHost = user?.id === roomDetail.user_id;

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Chat message send handler
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !token) return;

    const content = chatInput.trim();
    setChatInput("");

    try {
      // 1. Post to database
      const res = await api.postLiveComment(token, roomDetail.user_id, content);

      // 2. Broadcast via WS
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "live_comment",
          listing_id: roomDetail.user_id,
          comment: res
        }));
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === res.id)) return prev;
        return [...prev, res];
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi khi gửi bình luận", "danger");
    }
  };

  // Scroll detection
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
      setShowScrollDownBtn(isScrolledUp || highlightedMsgId !== null);
    }
  };

  // Click message to highlight
  const handleMessageClick = (msgId: string) => {
    setHighlightedMsgId((prev) => (prev === msgId ? null : msgId));
    setShowScrollDownBtn(true);
  };

  // Scroll to bottom and clear highlights
  const handleScrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
    setHighlightedMsgId(null);
    setShowScrollDownBtn(false);
  };

  // Heart trigger helper
  const triggerHeartAnimation = () => {
    const id = ++heartIdRef.current;
    const left = Math.floor(Math.random() * 60) + 20;
    setHearts((prev) => [...prev, { id, left }]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2500);
  };

  // Heart click handler
  const handleLike = () => {
    triggerHeartAnimation();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "live_heart",
        listing_id: roomDetail.user_id
      }));
    }
  };

  const streamerName = roomDetail.user?.profile?.full_name ?? roomDetail.user?.email ?? "Người dùng";
  const initials = streamerName[0]?.toUpperCase();

  return (
    <div style={{ animation: "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
      {/* Back button and header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Link href="/livestream" className="button ghost sm" style={{ color: "var(--color-peach)", fontWeight: 600 }}>
          ← Quay lại danh sách phòng live
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Collapse/Expand chat button */}
          <button
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className="button secondary sm"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-inset)" }}
          >
            {isChatCollapsed ? <MessageSquare size={14} /> : <MessageSquareOff size={14} />}
            {isChatCollapsed ? "Hiện khung chat" : "Ẩn khung chat"}
          </button>
          
          <div className="livestream-streamer-avatar" style={{ width: 32, height: 32, fontSize: 13, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent)", color: "white", fontWeight: "bold" }}>
            {roomDetail.user?.profile?.avatar_url ? (
              <img src={roomDetail.user.profile.avatar_url} alt={streamerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : initials}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {streamerName} <span style={{ color: "#ff6b6b", fontSize: 10 }}>● {isHost ? "BẠN ĐANG LIVE" : "ĐANG LIVE"}</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Main 2 Column Grid */}
      <div className={`livestream-room-layout ${isChatCollapsed ? "chat-collapsed" : ""}`}>
        
        {/* Left Column: Video Player + Products List */}
        <div className="live-left-container">
          
          {/* Video Player Area */}
          <div 
            className="live-player-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
          >
            <video
              ref={(el) => {
                // @ts-ignore
                videoRef.current = el;
                if (el) {
                  if (isHost) {
                    el.srcObject = localStream;
                  } else {
                    el.srcObject = remoteStream;
                  }
                }
              }}
              className="live-video-placeholder"
              autoPlay
              playsInline
              muted={isMuted}
              style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
            />

            {/* Emitter of floating hearts */}
            <div className="heart-emitter">
              {hearts.map((h) => (
                <span
                  key={h.id}
                  className="floating-heart"
                  style={{ left: `${h.left}%` }}
                >
                  ❤️
                </span>
              ))}
            </div>

            {/* Camera Access Error Block */}
            {isHost && hasCameraError && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "rgba(249, 115, 22, 0.15)",
                backdropFilter: "blur(20px)", border: "2px solid #ea580c", borderRadius: 8, padding: 24, textAlign: "center", zIndex: 30
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <h4 style={{ color: "#ea580c", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Cảnh báo thiết bị Camera</h4>
                <p style={{ color: "var(--text)", fontSize: 13, maxWidth: 350, margin: 0, lineHeight: 1.5 }}>
                  Không tìm thấy thiết bị camera hoặc quyền truy cập camera bị từ chối. Vui lòng kết nối camera để bắt đầu phát sóng!
                </p>
              </div>
            )}

            {/* Viewer Waiting Block */}
            {!isHost && !remoteStream && !isLiveEnded && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)",
                color: "white", padding: 20, textAlign: "center", zIndex: 30
              }}>
                <div className="spinner" style={{ marginBottom: 15 }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Đang chờ luồng phát sóng từ chủ phòng...</span>
              </div>
            )}

            {/* Live Ended Block */}
            {!isHost && isLiveEnded && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.95)",
                color: "white", padding: 20, textAlign: "center", zIndex: 30
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔴</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Livestream đã kết thúc</h3>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 300, margin: "0 auto 16px" }}>
                  Chủ phòng đã tắt phát trực tiếp hoặc ngắt kết nối.
                </p>
                <Link href="/livestream" className="button secondary sm">
                  Quay lại danh sách live
                </Link>
              </div>
            )}

            {/* Video Controls & Live Overlay UI */}
            <div className={`live-video-overlay ${showControls ? "show-controls" : ""}`}>
              
              {/* Top header overlay */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="overlay-interactive">
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="livestream-live-badge" style={{ position: "static" }}>
                    <span className="live-dot" />
                    TRỰC TIẾP
                  </span>
                  <span className="livestream-viewers" style={{ position: "static" }}>
                    👥 {viewers} xem
                  </span>
                </div>
                
                <button
                  className="button sm"
                  style={{ background: "rgba(0,0,0,0.6)", color: "white", border: "1px solid rgba(255,255,255,0.15)", padding: "4px 8px" }}
                  onClick={() => showToast("Đã gửi báo cáo phòng livestream này tới quản trị viên.", "success")}
                >
                  <AlertTriangle size={12} style={{ marginRight: 4 }} /> Báo cáo
                </button>
              </div>

              {/* Middle decorative panel: Title overlay */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white", margin: 0 }}>
                  {roomDetail.title || "Phòng Livestream bán hàng"}
                </h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0 }}>
                    Bởi <span style={{ fontWeight: 600, color: "var(--color-peach)" }}>{streamerName}</span>
                  </p>
                  {/* Tags */}
                  {roomDetail.tags && roomDetail.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                    <span key={tag} style={{ fontSize: 10, background: "rgba(255, 75, 75, 0.25)", border: "1px solid rgba(255,75,75,0.4)", padding: "1px 6px", borderRadius: 4, color: "white" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom bar overlay */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="overlay-interactive">
                
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Mute toggle button */}
                  <button
                    className="button circle sm"
                    style={{ background: "rgba(0,0,0,0.6)", color: "white", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                      }
                      setIsMuted(!isMuted);
                    }}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  {/* Fullscreen toggle button */}
                  <button
                    className="button circle sm"
                    style={{ background: "rgba(0,0,0,0.6)", color: "white", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={handleToggleFullscreen}
                    title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                  >
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>

                {/* Heart/Like button */}
                <button
                  className="button circle sm"
                  style={{
                    background: "linear-gradient(135deg, #ff4b4b, #ff7b7b)",
                    color: "white",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(255, 75, 75, 0.4)",
                    border: "none"
                  }}
                  onClick={handleLike}
                  title="Thả tim"
                >
                  <Heart size={20} fill="currentColor" />
                </button>

              </div>

            </div>
          </div>

          {/* Product List Panel (Horizontal Scroll below video) */}
          <div className="live-sidebar-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <h3 className="panel-header-title">🛍️ Sản phẩm đang bán</h3>
              <span className="badge" style={{ fontSize: 11, background: "rgba(249, 177, 122, 0.12)", color: "var(--color-peach)" }}>
                {listings.length} món
              </span>
            </div>

            <div className="panel-content custom-scrollbar" style={{ display: "flex", flexDirection: "row", gap: 12, overflowX: "auto", overflowY: "hidden", flexWrap: "nowrap", padding: "12px 16px" }}>
              {loadingListings ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="skeleton" style={{ width: 220, height: 70, borderRadius: "var(--radius)" }} />
                  <div className="skeleton" style={{ width: 220, height: 70, borderRadius: "var(--radius)" }} />
                </div>
              ) : listings.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, textAlign: "center", width: "100%", padding: 12 }}>
                  Không có sản phẩm nào của shop này.
                </p>
              ) : (
                listings.map((item) => (
                  <div key={item.id} className="sidebar-product-item" style={{ display: "flex", flexShrink: 0, width: 280, gap: 10, padding: 8, alignItems: "center" }}>
                    <img
                      src={item.image_urls?.[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=80&q=80"}
                      alt={item.title}
                      className="sidebar-product-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22%3E%3Crect fill=%22%23222%22 width=%2250%22 height=%2250%22/%3E%3C/svg%3E";
                      }}
                    />
                    <div className="sidebar-product-info">
                      <h4 className="sidebar-product-title" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="sidebar-product-price">
                        ₫{parseFloat(item.price).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                      <WishlistButton listingId={item.id} iconSize={14} style={{ display: "inline-block" }} />
                      <Link
                        href={`/listings/${item.id}`}
                        target="_blank"
                        className="button primary sm"
                        style={{ fontSize: 11, padding: "4px 8px", minWidth: "auto", background: "linear-gradient(135deg, var(--color-peach), #ff8c5a)" }}
                      >
                        Mua ngay
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Live Chat Messages */}
        {!isChatCollapsed && (
          <div className="live-sidebar-panel" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <div className="panel-header">
              <h3 className="panel-header-title">💬 Trò chuyện trực tiếp</h3>
            </div>

            <div
              className="panel-content custom-scrollbar chat-messages-list"
              ref={chatContainerRef}
              onScroll={handleScroll}
            >
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const senderDisplay = msg.sender?.profile?.full_name ?? msg.sender?.email ?? "Người dùng";
                const dateStr = formatDate(msg.created_at);

                return (
                  <div
                    key={msg.id}
                    className={`chat-message-item ${highlightedMsgId === msg.id ? "highlighted" : ""}`}
                    onClick={() => handleMessageClick(msg.id)}
                  >
                    <span className="muted" style={{ fontSize: 10, marginRight: 6 }}>
                      [{dateStr}]
                    </span>
                    <span className={`chat-message-user ${isMe ? "me" : ""}`}>
                      {senderDisplay}:
                    </span>
                    <span className="chat-message-text" style={{ color: "var(--text-secondary)" }}>
                      {msg.content}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {showScrollDownBtn && (
              <button
                type="button"
                className="scroll-down-btn"
                onClick={handleScrollToBottom}
              >
                Cuộn xuống tin nhắn mới nhất ↓
              </button>
            )}

            <form onSubmit={handleSendChat} className="chat-input-area">
              <input
                type="text"
                className="chat-input"
                placeholder="Nhập bình luận..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                className="button primary sm"
                style={{ padding: "8px 12px", background: "var(--color-peach)", color: "var(--color-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}
                disabled={!chatInput.trim()}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
