"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { api } from "@/lib/api";
import type { Listing, UserPublic } from "@/lib/types";
import { conditionLabels, formatDate, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    // Load listings independently — failure shouldn't show "not found"
    void api.getUserListings(params.userId).then(
      (items) => { if (active) setListings(items); },
      () => { /* listings failed, profile still shows */ },
    );
    return () => { active = false; };
  }, [params.userId]);

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

  const name = userProfile.profile?.full_name ?? "Người dùng";
  const initials = getInitials(userProfile.profile?.full_name);
  const activeListings = listings.filter((l) => l.status === "AVAILABLE");
  const soldListings = listings.filter((l) => l.status === "SOLD");

  return (
    <PageShell title={name}>
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

          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{name}</div>
            {userProfile.profile?.bio ? (
              <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>{userProfile.profile.bio}</p>
            ) : null}
          </div>

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

        {/* Right: User's listings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="split">
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>Sản phẩm của {name}</h2>
            <span className="badge">{listings.length} tin</span>
          </div>

          {listings.length === 0 ? (
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
          )}
        </div>
      </div>
    </PageShell>
  );
}
