"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { conditionLabels, formatDate, formatPrice, getInitials, statusLabels, timeAgo, getMediaUrl, getWebSocketUrl } from "@/lib/utils";
import { LocationDisplay } from "@/components/location-display";
import { Video, Tv, X } from "lucide-react";
import WishlistButton from "@/components/product/WishlistButton";
import styles from "@/components/product/ProductDetail.module.css";

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [offerPrice, setOfferPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // Livestream states & refs
  const [streamActive, setStreamActive] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [broadcasterId, setBroadcasterId] = useState<string | null>(null);
  const [wsTrigger, setWsTrigger] = useState(0);
  const [showCameraWarning, setShowCameraWarning] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const viewerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceQueueRef = useRef<any[]>([]);

  const stateRef = useRef({ isBroadcasting, isWatching, listingId: listing?.id, broadcasterId });
  useEffect(() => {
    stateRef.current = { isBroadcasting, isWatching, listingId: listing?.id, broadcasterId };
  }, [isBroadcasting, isWatching, listing, broadcasterId]);

  const startBroadcasting = async () => {
    if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setShowCameraWarning(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsBroadcasting(true);
      setStreamActive(true);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "stream_start",
          listing_id: params.listingId
        }));
      }
      showToast("Đang phát trực tiếp livestream!", "success");
    } catch (err) {
      showToast("Không thể mở camera/micro: " + (err instanceof Error ? err.message : ""), "danger");
    }
  };

  const stopBroadcasting = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsBroadcasting(false);
    setStreamActive(false);
    
    viewerConnections.current.forEach(pc => pc.close());
    viewerConnections.current.clear();
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWsTrigger(prev => prev + 1);
    showToast("Đã dừng phát livestream", "default");
  };

  const startWatching = () => {
    if (!token || !listing) return;
    setIsWatching(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "stream_join",
        listing_id: listing.id,
        broadcaster_id: listing.owner_id
      }));
    }
  };

  const stopWatching = () => {
    setIsWatching(false);
    setRemoteStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    iceQueueRef.current = [];
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "stream_leave",
        listing_id: listing?.id,
        broadcaster_id: listing?.owner_id
      }));
    }
  };

  const handleViewerJoin = async (viewerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    viewerConnections.current.set(viewerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "stream_ice",
          target_id: viewerId,
          candidate: event.candidate,
          listing_id: params.listingId
        }));
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "stream_offer",
          target_id: viewerId,
          sdp: offer,
          listing_id: params.listingId
        }));
      }
    } catch (err) {
      console.error("Failed to create offer for viewer", viewerId, err);
    }
  };

  const handleViewerLeave = (viewerId: string) => {
    const pc = viewerConnections.current.get(viewerId);
    if (pc) {
      pc.close();
      viewerConnections.current.delete(viewerId);
    }
  };

  const handleStreamOffer = async (bId: string, sdp: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "stream_ice",
          target_id: bId,
          candidate: event.candidate,
          listing_id: params.listingId
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "stream_answer",
          target_id: bId,
          sdp: answer,
          listing_id: params.listingId
        }));
      }

      while (iceQueueRef.current.length > 0) {
        const cand = iceQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      }
    } catch (err) {
      console.error("Error setting up remote stream", err);
    }
  };

  const handleStreamAnswer = async (viewerId: string, sdp: any) => {
    const pc = viewerConnections.current.get(viewerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("Error setting remote answer for viewer", viewerId, err);
      }
    }
  };

  const handleStreamIce = async (senderId: string, candidate: any) => {
    const { isBroadcasting, isWatching } = stateRef.current;
    if (isBroadcasting) {
      const pc = viewerConnections.current.get(senderId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate for viewer", senderId, err);
        }
      }
    } else if (isWatching) {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate from broadcaster", err);
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    }
  };

  useEffect(() => {
    if (!token) return;

    const wsUrl = getWebSocketUrl(token);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { isBroadcasting: curBroadcasting, isWatching: curWatching, listingId, broadcasterId: curBroadcasterId } = stateRef.current;
        
        if (data.type === "stream_active" && data.listing_id === params.listingId) {
          setStreamActive(true);
          setBroadcasterId(data.broadcaster_id);
        } else if (data.type === "stream_inactive" && data.broadcaster_id === curBroadcasterId) {
          setStreamActive(false);
          setBroadcasterId(null);
          if (curWatching) {
            stopWatching();
            showToast("Livestream đã kết thúc.", "default");
          }
        } else if (data.type === "stream_join" && curBroadcasting) {
          handleViewerJoin(data.viewer_id);
        } else if (data.type === "stream_leave" && curBroadcasting) {
          handleViewerLeave(data.viewer_id);
        } else if (data.type === "stream_offer" && curWatching) {
          handleStreamOffer(data.sender_id, data.sdp);
        } else if (data.type === "stream_answer" && curBroadcasting) {
          handleStreamAnswer(data.sender_id, data.sdp);
        } else if (data.type === "stream_ice") {
          handleStreamIce(data.sender_id, data.candidate);
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, wsTrigger]);

  useEffect(() => {
    setMounted(true);
  }, []);



  useEffect(() => {
    let active = true;
    void api.getListing(params.listingId).then(
      (item) => {
        if (!active) return;
        setListing(item);
        setLoading(false);
        // Load seller's other listings
        if (item.owner_id) {
          api.getUserListings(item.owner_id).then((all) => {
            if (!active) return;
            setRelatedListings(all.filter((l) => l.id !== item.id).slice(0, 4));
          });
        }
        
        // Load questions
        api.getListingQuestions(params.listingId).then(data => {
            if (active && Array.isArray(data)) setQuestions(data);
        }).catch(() => {});
        
      },
      () => { if (active) setLoading(false); },
    );
    return () => { active = false; };
  }, [params.listingId]);

  const handleAskQuestion = async () => {
    if (!token) return showToast("Vui lòng đăng nhập để gửi câu hỏi", "default");
    if (!newQuestion.trim()) return;
    try {
        const data = await api.askQuestion(token, params.listingId, newQuestion);
        setQuestions([data, ...questions]);
        setNewQuestion("");
        showToast("Đã gửi câu hỏi", "success");
    } catch {
        showToast("Lỗi khi gửi câu hỏi", "danger");
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    const text = replyText[questionId];
    if (!token) return showToast("Vui lòng đăng nhập để trả lời câu hỏi", "default");
    if (!text || !text.trim()) return;
    try {
        const data = await api.answerQuestion(token, questionId, text);
        setQuestions(questions.map(q => q.id === questionId ? data : q));
        setReplyText({ ...replyText, [questionId]: "" });
        showToast("Đã trả lời câu hỏi", "success");
    } catch {
        showToast("Lỗi khi trả lời", "danger");
    }
  };

  const handleOffer = async () => {
    if (!token || !listing || !offerPrice) return;
    setActionLoading(true);
    try {
      await api.createOffer(token, { listing_id: listing.id, price: Number(offerPrice) });
      showToast("Đã gửi đề xuất giá!", "success");
      setOfferPrice("");
    } catch (err) { showToast(err instanceof Error ? err.message : "Không thể gửi đề xuất.", "danger"); }
    finally { setActionLoading(false); }
  };

  const handleConversation = async () => {
    if (!token || !listing?.owner) return;
    setActionLoading(true);
    try {
      await api.createConversation(token, {
        participant_ids: [listing.owner.id],
        listing_id: listing.id,
        title: `Hỏi về: ${listing.title}`,
      });
      showToast("Đã tạo cuộc hội thoại!", "success");
      router.push("/inbox");
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
    finally { setActionLoading(false); }
  };

  const handleReport = async () => {
    if (!token || !listing || !reportReason.trim()) return;
    try {
      await api.createReport(token, { target_type: "LISTING", target_id: listing.id, reason: reportReason });
      showToast("Đã gửi báo cáo.", "success");
      setShowReport(false);
      setReportReason("");
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin đăng này?")) return;
    setActionLoading(true);
    try {
      await api.deleteListing(token!, listing!.id);
      showToast("Đã xóa tin đăng thành công!", "success");
      router.push("/profile");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xóa tin thất bại", "danger");
    } finally {
      setActionLoading(false);
    }
  };



  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: listing?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast("Đã sao chép liên kết!", "success");
    }
  };

  if (loading) {
    return (
      <PageShell title="Đang tải...">
        <div className="grid two">
          <div className="panel"><div className="skeleton" style={{ height: 300 }} /></div>
          <div className="panel"><div className="skeleton" style={{ height: 300 }} /></div>
        </div>
      </PageShell>
    );
  }

  if (!listing) {
    return (
      <PageShell title="Không tìm thấy">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Tin đăng không tồn tại</h3>
          <p>Tin đăng đã bị xóa hoặc không tồn tại.</p>
          <Link href="/" className="button primary" style={{ marginTop: 16 }}>← Về trang chủ</Link>
        </div>
      </PageShell>
    );
  }

  const isOwner = user && listing.owner?.id === user.id;
  const statusCls = listing.status === "AVAILABLE" ? "badge-success" : listing.status === "SOLD" ? "badge-danger" : "badge-warning";
  const sellerName = listing.owner?.profile?.full_name ?? listing.owner?.email ?? "Người bán";
  const sellerInitials = getInitials(listing.owner?.profile?.full_name, listing.owner?.email?.[0]?.toUpperCase());

  return (
    <PageShell title={listing.title}>
      <div className={styles.container}>
        {/* Left: Images + Product Info */}
        <section className={styles.leftCol}>
          {/* Image gallery */}
          {listing.image_urls.length > 0 ? (
            <div className={`${styles.galleryWrapper} glass-panel`}>
              <div
                className={styles.mainImage}
                style={{
                  backgroundImage: `url(${getMediaUrl(listing.image_urls[currentImage])})`,
                }}
              />
              {listing.image_urls.length > 1 ? (
                <div className={styles.thumbnailContainer}>
                  {listing.image_urls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentImage(i)}
                      className={`${styles.thumbnail} ${i === currentImage ? styles.activeThumbnail : ""}`}
                      style={{
                        backgroundImage: `url(${getMediaUrl(url)})`,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={`${styles.galleryWrapper} glass-panel`} style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "var(--text-tertiary)" }}>📷</div>
          )}

          {/* Description Video if exists */}
          {listing.video_url && (
            <div className={`${styles.detailPanel} glass-panel`}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>🎥 Video mô tả sản phẩm</h3>
              <video src={listing.video_url} controls style={{ width: "100%", maxHeight: 360, borderRadius: 8, background: "#000" }} />
            </div>
          )}

          {/* Product info card */}
          <div className={`${styles.detailPanel} glass-panel`}>
            <div className="inline">
              <span className={`badge ${statusCls}`}>{statusLabels[listing.status] ?? listing.status}</span>
              <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
              {listing.category ? <span className="badge badge-info">{listing.category.name}</span> : null}
              {listing.brand ? <span className="badge badge-warning">Hiệu: {listing.brand}</span> : null}
              {listing.has_warranty ? <span className="badge badge-success">✓ Còn bảo hành</span> : null}
            </div>

            <div className={styles.price}>{formatPrice(listing.price)} ₫</div>

            <p className={styles.description}>
              {listing.description ?? "Chưa có mô tả chi tiết."}
            </p>

            {listing.location_data ? (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>📍 Địa điểm giao dịch</span>
                <LocationDisplay location={listing.location_data} />
              </div>
            ) : null}

            <div className="muted" style={{ fontSize: 12 }}>
              {mounted ? (
                <>Đăng {timeAgo(listing.created_at)} · {formatDate(listing.created_at)}</>
              ) : "..."}
            </div>

            <div className="divider" />

            <div className={styles.actionRow}>
              <WishlistButton listingId={listing.id} iconSize={16} variant="text" />
              <button className="button ghost sm" type="button" onClick={handleShare}>📤 Chia sẻ</button>
              {!isOwner ? (
                <button className="button ghost sm" type="button" onClick={handleConversation} disabled={actionLoading}>
                  💬 Nhắn tin
                </button>
              ) : null}
            </div>
          </div>

          {/* Q&A Section */}
          <div className={`${styles.detailPanel} glass-panel`}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Hỏi & Đáp ({questions.length})</h3>
            
            {!isOwner && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input 
                  placeholder="Đặt câu hỏi cho người bán..." 
                  value={newQuestion} 
                  onChange={e => setNewQuestion(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="button primary" onClick={handleAskQuestion}>Gửi</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {questions.map(q => (
                <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, background: "var(--bg-inset)", borderRadius: "var(--radius-sm)" }}>
                  <div className="split">
                    <strong style={{ fontSize: 14 }}>{q.asker?.profile?.display_name || q.asker?.profile?.full_name || "Người dùng ẩn"}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(q.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14 }}>Q: {q.question}</p>
                  
                  {q.answer ? (
                    <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--accent)", marginTop: 4 }}>
                      <strong style={{ fontSize: 13, color: "var(--accent)" }}>Người bán:</strong>
                      <p style={{ margin: 0, fontSize: 14 }}>{q.answer}</p>
                    </div>
                  ) : isOwner ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <input 
                        placeholder="Trả lời câu hỏi này..." 
                        value={replyText[q.id] || ""}
                        onChange={e => setReplyText({...replyText, [q.id]: e.target.value})}
                        style={{ flex: 1, padding: "6px 10px", fontSize: 13 }}
                      />
                      <button className="button secondary sm" onClick={() => handleAnswerQuestion(q.id)}>Trả lời</button>
                    </div>
                  ) : null}
                </div>
              ))}
              {questions.length === 0 && <div className="muted" style={{ fontSize: 14, textAlign: "center", padding: "12px 0" }}>Chưa có câu hỏi nào.</div>}
            </div>
          </div>
        </section>

        {/* Right: Seller + Actions */}
        <section className={styles.rightCol}>
          {/* Seller card */}
          <Link href={`/users/${listing.owner_id}`} className={`${styles.sellerPanel} glass-panel`}>
            <div className={styles.sellerAvatar}>{sellerInitials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{sellerName}</div>
              {listing.owner?.profile?.bio ? (
                <div className="muted truncate" style={{ fontSize: 13 }}>{listing.owner.profile.bio}</div>
              ) : null}
              <div className="muted" style={{ fontSize: 12 }}>Thành viên từ {formatDate(listing.owner?.created_at ?? listing.created_at)}</div>
            </div>
            <span style={{ color: "var(--text-tertiary)", fontSize: 18 }}>→</span>
          </Link>

          {/* Owner Actions */}
          {isOwner && (
            <div className={`${styles.detailPanel} glass-panel`}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>⚙️ Quản lý tin đăng</h2>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Bạn là chủ sở hữu của tin đăng này.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href={`/listings/${listing.id}/edit`} className="button primary sm" style={{ width: "100%", display: "block", textAlign: "center", textDecoration: "none", padding: "8px 12px" }}>
                  ✏️ Chỉnh sửa tin đăng
                </Link>
                <button 
                  className="button danger sm" 
                  type="button" 
                  onClick={handleDeleteListing} 
                  disabled={actionLoading}
                  style={{ width: "100%", display: "block", padding: "8px 12px" }}
                >
                  🗑️ Xóa tin đăng (Đưa vào Thùng rác)
                </button>
                <button
                  type="button"
                  className="button secondary sm"
                  onClick={startBroadcasting}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px" }}
                >
                  <Video size={16} /> Phát livestream giới thiệu
                </button>
              </div>
            </div>
          )}

          {/* Livestream Area */}
          {!isOwner && (
            <div className={`${styles.detailPanel} ${styles.liveWrapper} ${streamActive ? styles.liveWrapperActive : ""} glass-panel`}>
              <div className={styles.liveHeader}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Tv size={18} /> Livestream sản phẩm
                </h3>
                {streamActive && (
                  <span className={styles.liveIndicator}>
                    🔴 LIVE
                  </span>
                )}
              </div>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                {streamActive 
                  ? "Chủ sản phẩm đang phát trực tiếp! Xem ngay để thấy rõ chi tiết sản phẩm."
                  : "Hiện tại không có livestream nào từ người bán."}
              </p>
              <button 
                className={`button ${streamActive ? "danger" : "secondary"} sm`} 
                type="button" 
                onClick={startWatching}
                style={{ width: "100%" }}
              >
                📺 Xem Livestream giới thiệu
              </button>
            </div>
          )}

          {/* Offer form */}
          {!isOwner && listing.status === "AVAILABLE" ? (
            <div className={`${styles.detailPanel} glass-panel`}>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>💰 Đề xuất giá</h2>
              <p className="muted" style={{ fontSize: 13 }}>Giá đăng: {formatPrice(listing.price)} ₫ — Đề xuất mức giá bạn cho là hợp lý.</p>
              <div className="field">
                <label htmlFor="offerPrice">Giá đề xuất (VNĐ)</label>
                <input id="offerPrice" type="number" min="0" placeholder="Nhập giá bạn muốn trả" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
              </div>
              <button className="button primary" type="button" onClick={handleOffer} disabled={actionLoading || !offerPrice}>
                {actionLoading ? "Đang gửi..." : "Gửi đề xuất"}
              </button>
            </div>
          ) : null}

          {/* Report */}
          <div className={`${styles.detailPanel} glass-panel`}>
            {!showReport ? (
              <button className="button ghost sm" type="button" onClick={() => setShowReport(true)} style={{ alignSelf: "flex-start", color: "var(--text-tertiary)", fontSize: 13, padding: 0 }}>
                🚩 Báo cáo vi phạm
              </button>
            ) : (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Báo cáo vi phạm</h2>
                <div className="field">
                  <textarea placeholder="Mô tả lý do báo cáo..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} style={{ minHeight: 80 }} />
                </div>
                <div className="inline">
                  <button className="button danger sm" type="button" onClick={handleReport}>Gửi báo cáo</button>
                  <button className="button ghost sm" type="button" onClick={() => setShowReport(false)}>Hủy</button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Related listings from same seller */}
      {relatedListings.length > 0 ? (
        <div style={{ marginTop: 32 }}>
          <div className="split" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>Sản phẩm khác từ {sellerName}</h2>
            <Link href={`/users/${listing.owner_id}`} className="button ghost sm">Xem tất cả →</Link>
          </div>
          <div className="grid four">
            {relatedListings.map((related) => (
              <Link href={`/listings/${related.id}`} key={related.id} className="card" style={{ textDecoration: "none" }}>
                <div className="inline">
                  <span className={`badge ${related.status === "AVAILABLE" ? "badge-success" : "badge-danger"}`}>
                    {statusLabels[related.status] ?? related.status}
                  </span>
                </div>
                <h3 className="truncate" style={{ fontSize: 14 }}>{related.title}</h3>
                <div className="price-sm">{formatPrice(related.price)} ₫</div>
                <div className="muted" style={{ fontSize: 11 }}>{timeAgo(related.created_at)}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {/* Broadcaster Modal */}
      {isBroadcasting && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(12px)",
          zIndex: 9999, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "white", padding: 20
        }}>
          <div style={{ width: "100%", maxWidth: 650, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "white", margin: 0 }}>🔴 Đang phát Livestream</h2>
              <span style={{ fontSize: 11, background: "var(--danger)", color: "white", padding: "4px 8px", borderRadius: 4, fontWeight: "bold" }}>
                LIVE
              </span>
            </div>
            
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#1e293b", height: 380 }}>
              <video 
                ref={(el) => { if (el) el.srcObject = localStream; }} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
              />
              <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                Camera của bạn
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 15 }}>
              <button className="button danger" onClick={stopBroadcasting} style={{ padding: "12px 24px" }}>
                Dừng phát sóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {isWatching && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(12px)",
          zIndex: 9999, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", color: "white", padding: 20
        }}>
          <div style={{ width: "100%", maxWidth: 650, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "white", margin: 0 }}>📺 Xem Livestream giới thiệu</h2>
              <button 
                type="button" 
                onClick={stopWatching} 
                style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#1e293b", height: 380 }}>
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
                  <span>Đang chờ nhận luồng video từ người bán...</span>
                </div>
              )}
              <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                Video người bán
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 15 }}>
              <button className="button secondary" onClick={stopWatching} style={{ padding: "10px 20px" }}>
                Đóng
              </button>
            </div>
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

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </PageShell>
  );
}
