"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { conditionLabels, formatDate, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";

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
  const [favorited, setFavorited] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

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
        fetch(`http://localhost:8000/api/v1/listings/${params.listingId}/questions`).then(res => res.json()).then(data => {
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
        const res = await fetch(`http://localhost:8000/api/v1/listings/${params.listingId}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ question: newQuestion })
        });
        if (res.ok) {
            const data = await res.json();
            setQuestions([data, ...questions]);
            setNewQuestion("");
            showToast("Đã gửi câu hỏi", "success");
        }
    } catch (_e) {
        showToast("Lỗi khi gửi câu hỏi", "danger");
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    const text = replyText[questionId];
    if (!text || !text.trim()) return;
    try {
        const res = await fetch(`http://localhost:8000/api/v1/listings/questions/${questionId}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ answer: text })
        });
        if (res.ok) {
            const data = await res.json();
            setQuestions(questions.map(q => q.id === questionId ? data : q));
            setReplyText({ ...replyText, [questionId]: "" });
            showToast("Đã trả lời câu hỏi", "success");
        }
    } catch (_e) {
        showToast("Lỗi khi trả lời", "danger");
    }
  };

  const handleFavorite = async () => {
    if (!token || !listing) return;
    try {
      const result = await api.toggleFavorite(token, listing.id);
      setFavorited(result.favorite);
      showToast(result.favorite ? "Đã thêm vào yêu thích ❤️" : "Đã bỏ yêu thích", "success");
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi", "danger"); }
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
      <div className="grid two">
        {/* Left: Images + Product Info */}
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Image gallery */}
          {listing.image_urls.length > 0 ? (
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                height: 320,
                background: `url(${listing.image_urls[currentImage]}) center/contain no-repeat`,
                backgroundColor: "var(--bg-inset)",
              }} />
              {listing.image_urls.length > 1 ? (
                <div style={{ display: "flex", gap: 4, padding: 8, overflowX: "auto" }}>
                  {listing.image_urls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentImage(i)}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "var(--radius-sm)",
                        background: `url(${url}) center/cover no-repeat`,
                        border: i === currentImage ? "2px solid var(--accent)" : "2px solid transparent",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="panel" style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "var(--text-tertiary)" }}>📷</div>
          )}

          {/* Product info card */}
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="inline">
              <span className={`badge ${statusCls}`}>{statusLabels[listing.status] ?? listing.status}</span>
              <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
              {listing.category ? <span className="badge badge-info">{listing.category.name}</span> : null}
            </div>

            <div className="price">{formatPrice(listing.price)} ₫</div>

            <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
              {listing.description ?? "Chưa có mô tả chi tiết."}
            </p>

            {listing.location_data ? (
              <div className="inline" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                📍 {typeof listing.location_data === "object" && "city" in listing.location_data ? String(listing.location_data.city) : JSON.stringify(listing.location_data)}
              </div>
            ) : null}

            <div className="muted" style={{ fontSize: 12 }}>
              Đăng {timeAgo(listing.created_at)} · {formatDate(listing.created_at)}
            </div>

            <div className="divider" />

            <div className="inline">
              <button className="button secondary sm" type="button" onClick={handleFavorite}>
                {favorited ? "❤️ Đã thích" : "🤍 Yêu thích"}
              </button>
              <button className="button ghost sm" type="button" onClick={handleShare}>📤 Chia sẻ</button>
              {!isOwner ? (
                <button className="button ghost sm" type="button" onClick={handleConversation} disabled={actionLoading}>
                  💬 Nhắn tin
                </button>
              ) : null}
            </div>
          </div>

          {/* Q&A Section */}
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Seller card */}
          <Link href={`/users/${listing.owner_id}`} className="panel" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", transition: "border-color 0.2s" }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-full)",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}>{sellerInitials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{sellerName}</div>
              {listing.owner?.profile?.bio ? (
                <div className="muted truncate" style={{ fontSize: 13 }}>{listing.owner.profile.bio}</div>
              ) : null}
              <div className="muted" style={{ fontSize: 12 }}>Thành viên từ {formatDate(listing.owner?.created_at ?? listing.created_at)}</div>
            </div>
            <span style={{ color: "var(--text-tertiary)", fontSize: 18 }}>→</span>
          </Link>

          {/* Offer form */}
          {!isOwner && listing.status === "AVAILABLE" ? (
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!showReport ? (
              <button className="button ghost sm" type="button" onClick={() => setShowReport(true)} style={{ alignSelf: "flex-start", color: "var(--text-tertiary)", fontSize: 13 }}>
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
    </PageShell>
  );
}
