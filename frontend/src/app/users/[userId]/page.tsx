"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import type { Listing, UserPublic } from "@/lib/types";
import { conditionLabels, formatDate, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "reviews">("listings");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const { token, user: currentUser } = useAuth();

  useEffect(() => {
    let active = true;
    // Load user profile — this determines if user exists
    void api.getUser(params.userId).then(
      (profile) => {
        if (!active) return;
        setUserProfile(profile);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      },
    );
    // Load listings independently
    void api.getUserListings(params.userId).then(
      (items) => { if (active) setListings(items); },
      () => { /* listings failed */ },
    );
    // Load reviews
    if (token) {
      fetch(`http://localhost:8000/api/v1/users/${params.userId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (active && Array.isArray(data)) setReviews(data);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [params.userId, token]);

  const toggleFollow = async () => {
    if (!token) return alert("Vui lòng đăng nhập để theo dõi");
    try {
      if (isFollowing) {
        await fetch(`http://localhost:8000/api/v1/users/${params.userId}/follow`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
        setIsFollowing(false);
      } else {
        await fetch(`http://localhost:8000/api/v1/users/${params.userId}/follow`, { method: "POST", headers: { Authorization: `Bearer ${token}` }});
        setIsFollowing(true);
      }
    } catch (e) {
      alert("Lỗi khi theo dõi");
    }
  };

  if (loading) {
    return (
      <PageShell title="Đang tải...">
        <div className="grid two">
          <div className="panel"><div className="skeleton" style={{ height: 250 }} /></div>
          <div className="panel"><div className="skeleton" style={{ height: 250 }} /></div>
        </div>
      </PageShell>
    );
  }

  if (notFound || !userProfile) {
    return (
      <PageShell title="Không tìm thấy">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>Người dùng không tồn tại</h3>
          <p>Tài khoản này đã bị xóa hoặc không tồn tại.</p>
          <Link href="/" className="button primary" style={{ marginTop: 16 }}>← Về trang chủ</Link>
        </div>
      </PageShell>
    );
  }

  const name = userProfile.profile?.display_name || userProfile.profile?.full_name || "Người dùng";
  const initials = getInitials(name);
  const activeListings = listings.filter((l) => l.status === "AVAILABLE");
  const soldListings = listings.filter((l) => l.status === "SOLD");
  const isOwnProfile = currentUser?.id === userProfile.id;

  return (
    <PageShell title={name}>
      {userProfile.profile?.banner_url && (
        <div style={{ width: "100%", height: 200, borderRadius: "var(--radius-lg)", marginBottom: 24, overflow: "hidden", background: "var(--border)" }}>
          <img src={userProfile.profile.banner_url} alt="Shop Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div className="grid two" style={{ gridTemplateColumns: "320px 1fr" }}>
        {/* Left: Profile card */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 32, alignSelf: "start" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "var(--radius-full)",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>

            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{name}</div>
              {userProfile.profile?.shop_slug && (
                <div className="muted" style={{ fontSize: 14 }}>@{userProfile.profile.shop_slug}</div>
              )}
              {userProfile.profile?.bio && (
                <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>{userProfile.profile.bio}</p>
              )}
            </div>

            {!isOwnProfile && (
              <button className={`button ${isFollowing ? "secondary" : "primary"}`} style={{ width: "100%" }} onClick={toggleFollow}>
                {isFollowing ? "Đang theo dõi" : "Theo dõi Shop"}
              </button>
            )}

            <div className="divider" style={{ width: "100%" }} />

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="split">
              <span className="muted" style={{ fontSize: 13 }}>Tham gia</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(userProfile.created_at)}</span>
            </div>
            <div className="split">
              <span className="muted" style={{ fontSize: 13 }}>Đang bán</span>
              <span className="badge badge-success">{activeListings.length}</span>
            </div>
            <div className="split">
              <span className="muted" style={{ fontSize: 13 }}>Đã bán</span>
              <span className="badge badge-info">{soldListings.length}</span>
            </div>
            <div className="split">
              <span className="muted" style={{ fontSize: 13 }}>Tổng tin đăng</span>
              <span className="badge">{listings.length}</span>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <button 
              onClick={() => setActiveTab("listings")}
              style={{ background: "none", border: "none", padding: "8px 16px", cursor: "pointer", fontWeight: activeTab === "listings" ? 600 : 400, color: activeTab === "listings" ? "var(--accent)" : "var(--text)", borderBottom: activeTab === "listings" ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -11 }}
            >
              Sản phẩm ({listings.length})
            </button>
            <button 
              onClick={() => setActiveTab("reviews")}
              style={{ background: "none", border: "none", padding: "8px 16px", cursor: "pointer", fontWeight: activeTab === "reviews" ? 600 : 400, color: activeTab === "reviews" ? "var(--accent)" : "var(--text)", borderBottom: activeTab === "reviews" ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -11 }}
            >
              Đánh giá ({reviews.length})
            </button>
          </div>

          {activeTab === "listings" ? (
            listings.length === 0 ? (
              <div className="empty-state panel">
                <div className="empty-icon">📦</div>
                <h3>Chưa có tin đăng nào</h3>
                <p>Người dùng này chưa đăng bán sản phẩm nào.</p>
              </div>
            ) : (
              <div className="grid two" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {listings.map((listing) => {
                  const statusCls = listing.status === "AVAILABLE" ? "badge-success" : listing.status === "SOLD" ? "badge-danger" : "badge-warning";
                  return (
                    <article className="card" key={listing.id}>
                      <div className="inline">
                        <span className={`badge ${statusCls}`}>{statusLabels[listing.status] ?? listing.status}</span>
                        <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
                      </div>
                      <h3 className="truncate">{listing.title}</h3>
                      <p className="muted truncate" style={{ fontSize: 13 }}>{listing.description ?? "Không có mô tả"}</p>
                      <div className="price-sm">{formatPrice(listing.price)} ₫</div>
                      <div className="muted" style={{ fontSize: 12 }}>{timeAgo(listing.created_at)}</div>
                      <div className="card-actions">
                        <Link className="button secondary sm" href={`/listings/${listing.id}`}>
                          Xem chi tiết →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            reviews.length === 0 ? (
              <div className="empty-state panel">
                <div className="empty-icon">⭐</div>
                <h3>Chưa có đánh giá</h3>
                <p>Người dùng này chưa nhận được đánh giá nào.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reviews.map((r) => (
                  <div key={r.id} className="panel" style={{ padding: 16 }}>
                    <div className="split" style={{ marginBottom: 8 }}>
                      <strong>{r.reviewer?.profile?.display_name || r.reviewer?.profile?.full_name || "Người dùng ẩn"}</strong>
                      <span style={{ color: "orange" }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                    </div>
                    <p style={{ fontSize: 14 }}>{r.comment || "Không có nội dung đánh giá."}</p>
                    <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{formatDate(r.created_at)}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </PageShell>
  );
}
