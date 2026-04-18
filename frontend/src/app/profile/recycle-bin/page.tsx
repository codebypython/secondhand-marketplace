"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { conditionLabels, formatPrice, statusLabels, timeAgo } from "@/lib/utils";

export default function RecycleBinPage() {
  const { token, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (token) {
      setLoading(true);
      api.getDeletedListings(token)
        .then((items) => {
          if (active) setListings(items);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (!authLoading) {
      setLoading(false);
    }
    return () => { active = false; };
  }, [token, authLoading]);

  const handleRestore = async (listingId: string) => {
    if (!token) return;
    setActionLoading(listingId);
    try {
      await api.restoreListing(token, listingId);
      setListings(listings.filter(l => l.id !== listingId));
      showToast("Khôi phục bài đăng thành công!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Có lỗi xảy ra", "danger");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return <PageShell title="Thùng rác"><div className="panel">Đang tải...</div></PageShell>;
  }

  if (!token) {
    return (
      <PageShell title="Thùng rác">
        <div className="panel">Vui lòng đăng nhập.</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Thùng rác" description="Quản lý các tin đăng đã xóa của bạn">
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Tin đã xóa ({listings.length})</h2>
          <Link href="/profile" className="button ghost sm">← Quay lại Hồ sơ</Link>
        </div>
        
        {listings.length === 0 ? (
          <div className="empty-state panel">
            <div className="empty-icon">🗑️</div>
            <h3>Thùng rác trống</h3>
            <p>Bạn không có tin đăng nào bị xóa.</p>
          </div>
        ) : (
          <div className="grid two" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {listings.map((listing) => {
              const statusCls = listing.status === "AVAILABLE" ? "badge-success" : listing.status === "SOLD" ? "badge-danger" : "badge-warning";
              const isRestoring = actionLoading === listing.id;
              
              return (
                <article className="card" key={listing.id} style={{ opacity: isRestoring ? 0.5 : 1 }}>
                  <div className="inline">
                    <span className={`badge ${statusCls}`}>{statusLabels[listing.status] ?? listing.status}</span>
                    <span className="badge">{conditionLabels[listing.condition] ?? listing.condition}</span>
                    <span className="badge badge-danger">Đã xóa</span>
                  </div>
                  <h3 className="truncate" style={{ marginTop: 8 }}>{listing.title}</h3>
                  <div className="price-sm">{formatPrice(listing.price)} ₫</div>
                  
                  <div className="card-actions" style={{ marginTop: 12 }}>
                    <button 
                      className="button primary sm" 
                      onClick={() => handleRestore(listing.id)}
                      disabled={isRestoring}
                      style={{ width: "100%" }}
                    >
                      {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
