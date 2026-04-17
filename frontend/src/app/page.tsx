"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { conditionLabels, formatPrice, getInitials, statusLabels, timeAgo } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const cls = status === "AVAILABLE" ? "badge-success" : status === "SOLD" ? "badge-danger" : status === "RESERVED" ? "badge-warning" : "";
  return <span className={`badge ${cls}`}>{statusLabels[status] ?? status}</span>;
}

function SkeletonCard() {
  return (
    <div className="card" style={{ gap: 12 }}>
      <div className="skeleton" style={{ height: 140, borderRadius: "var(--radius)" }} />
      <div className="skeleton skeleton-text w-75" />
      <div className="skeleton skeleton-text w-50" />
      <div className="skeleton" style={{ height: 24, width: 100 }} />
    </div>
  );
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = search ? new URLSearchParams({ search }) : undefined;
    const timer = setTimeout(() => {
      void api.listListings(params).then(
        (items) => { if (active) { setListings(items); setError(null); setLoading(false); } },
        (err) => { if (active) { setError(err instanceof Error ? err.message : "Không thể tải danh sách."); setLoading(false); } },
      );
    }, search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  const stats = useMemo(() => {
    const available = listings.filter((l) => l.status === "AVAILABLE").length;
    const sold = listings.filter((l) => l.status === "SOLD").length;
    return [
      { label: "Đang bán", value: String(available), icon: "🏷️" },
      { label: "Đã bán", value: String(sold), icon: "✅" },
      { label: "Tổng tin", value: String(listings.length), icon: "📊" },
    ];
  }, [listings]);

  const handleShare = (listing: Listing) => {
    const url = `${window.location.origin}/listings/${listing.id}`;
    if (navigator.share) {
      navigator.share({ title: listing.title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div>
          <h1>Mua bán đồ cũ,{"\n"}đơn giản và an toàn.</h1>
          <p>Đăng tin miễn phí, thương lượng trực tiếp, hẹn gặp giao dịch — tất cả trên một nền tảng duy nhất. Kết nối cộng đồng mua bán đồ cũ đáng tin cậy.</p>
          <div className="hero-actions">
            <Link className="button primary" href="/listings/new">＋ Đăng tin mới</Link>
            <Link className="button secondary" href="/dashboard/offers">Xem giao dịch</Link>
            <Link className="button ghost" href="/inbox">💬 Tin nhắn</Link>
          </div>
        </div>
        <div className="grid three" style={{ width: "100%" }}>
          {stats.map((item) => (
            <div className="panel stat-card" key={item.label}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <div className="page-shell">
        <div className="page-header">
          <div>
            <h1>Khám phá sản phẩm</h1>
            <p>Tìm kiếm những món đồ bạn cần</p>
          </div>
        </div>

        <div className="page-grid">
          {/* Search bar */}
          <div className="panel" style={{ padding: "12px 16px" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                id="search"
                placeholder="🔍  Tìm kiếm theo tên sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: "none", background: "transparent", padding: "8px 0" }}
              />
            </div>
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          {loading ? (
            <div className="grid three">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}</div>
          ) : listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Chưa có tin đăng nào</h3>
              <p>{search ? "Không tìm thấy kết quả phù hợp." : "Hãy là người đầu tiên đăng tin!"}</p>
            </div>
          ) : (
            <div className="grid three">
              {listings.map((listing) => {
                const sellerName = listing.owner?.profile?.full_name ?? listing.owner?.email ?? "Người bán";
                const sellerInitials = getInitials(listing.owner?.profile?.full_name, listing.owner?.email?.[0]?.toUpperCase() ?? "?");
                return (
                  <article className="card" key={listing.id}>
                    {/* Image placeholder */}
                    {listing.image_urls.length > 0 ? (
                      <div style={{
                        height: 140,
                        borderRadius: "var(--radius)",
                        background: `url(${listing.image_urls[0]}) center/cover no-repeat`,
                        backgroundColor: "var(--bg-inset)",
                      }} />
                    ) : (
                      <div style={{
                        height: 140,
                        borderRadius: "var(--radius)",
                        background: "var(--bg-inset)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 32,
                        color: "var(--text-tertiary)",
                      }}>📷</div>
                    )}

                    <div className="inline">
                      <StatusBadge status={listing.status} />
                      <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
                      {listing.category ? <span className="badge badge-info">{listing.category.name}</span> : null}
                    </div>

                    <h3 className="truncate">{listing.title}</h3>
                    <p className="muted truncate" style={{ fontSize: 13 }}>{listing.description ?? "Chưa có mô tả."}</p>
                    <div className="price-sm">{formatPrice(listing.price)} ₫</div>

                    {/* Seller info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link
                        href={`/users/${listing.owner_id}`}
                        style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                      >
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: "var(--radius-full)",
                          background: "var(--accent-surface)",
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                        }}>{sellerInitials}</div>
                        <span className="muted" style={{ fontSize: 13 }}>{sellerName}</span>
                      </Link>
                      <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{timeAgo(listing.created_at)}</span>
                    </div>

                    <div className="card-actions">
                      <Link className="button secondary sm" href={`/listings/${listing.id}`}>Xem chi tiết</Link>
                      <button className="button ghost sm" type="button" onClick={() => handleShare(listing)} title="Chia sẻ">📤</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
