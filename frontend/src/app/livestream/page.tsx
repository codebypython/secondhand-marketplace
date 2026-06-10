"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";

export default function LivestreamDirectoryPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getActiveLiveRooms()
      .then((data) => {
        if (active) {
          setRooms(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load active live rooms:", err);
        if (active) {
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="stack-lg" style={{ animation: "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
      {/* Hero Section */}
      <section className="glass-panel" style={{
        padding: "40px 32px",
        borderRadius: "var(--radius-lg)",
        position: "relative",
        overflow: "hidden",
        background: "var(--glass-bg)"
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-20%",
          width: "80%",
          height: "180%",
          background: "radial-gradient(circle, rgba(255, 75, 75, 0.08) 0%, transparent 70%)",
          zIndex: 0,
          pointerEvents: "none"
        }} />

        <div className="stack-md" style={{ zIndex: 1, position: "relative" }}>
          <div className="inline-sm">
            <span className="badge badge-pulse" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", backgroundColor: "rgba(255, 75, 75, 0.15)", color: "#ff6b6b", border: "1px solid rgba(255, 75, 75, 0.25)" }}>
              ⚡ Trải nghiệm chốt đơn trực tiếp
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: "-1px",
            color: "var(--text)"
          }}>
            Phòng Livestream <span style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8c5a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trực Tiếp</span>
          </h1>

          <p style={{
            color: "var(--text-secondary)",
            fontSize: "15px",
            lineHeight: "1.6",
            maxWidth: "600px",
            margin: 0
          }}>
            Xem trực tiếp tình trạng sản phẩm, bình luận thảo luận thời gian thực với chủ cửa hàng và đặt mua ngay lập tức chỉ với một cú click chuột!
          </p>
        </div>
      </section>

      {/* Livestream Rooms Grid */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Các phiên live đang diễn ra</h2>
          <span className="muted" style={{ fontSize: 13 }}>{rooms.length} phòng đang phát</span>
        </div>

        {loading ? (
          <div className="livestream-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 350, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty-state panel" style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
            <h3>Chưa có phòng live nào đang hoạt động</h3>
            <p className="muted" style={{ maxWidth: 450, margin: "8px auto 16px" }}>
              Các chủ shop hiện đang offline. Bạn có thể bật tính năng Livestream trong Trang cá nhân để bắt đầu phát sóng phòng của riêng mình!
            </p>
            <Link href="/profile" className="button primary sm">
              Đến Trang cá nhân
            </Link>
          </div>
        ) : (
          <div className="livestream-grid">
            {rooms.map((room) => {
              const streamerName = room.user?.profile?.full_name ?? room.user?.email ?? "Người dùng";
              const initials = getInitials(streamerName, streamerName[0]?.toUpperCase());
              const tagsArray = room.tags ? room.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
              const previewImage = room.preview_url || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80";

              return (
                <div key={room.user_id} className="livestream-card" style={{ animation: "fadeUp 0.5s ease-out" }}>
                  <div className="livestream-preview-wrap">
                    <img
                      src={previewImage}
                      alt={room.title}
                      className="livestream-preview-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                    <div className="livestream-live-badge">
                      <span className="live-dot" />
                      <span>TRỰC TIẾP</span>
                    </div>
                  </div>

                  <div className="livestream-card-content">
                    <h3 className="livestream-card-title">{room.title || "Phòng livestream mua sắm"}</h3>

                    <div className="livestream-streamer-info">
                      <div className="livestream-streamer-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent)", color: "white", fontWeight: "bold" }}>
                        {room.user?.profile?.avatar_url ? (
                          <img src={room.user.profile.avatar_url} alt={streamerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : initials}
                      </div>
                      <span className="livestream-streamer-name">
                        {streamerName} <span style={{ color: "var(--color-peach)", fontSize: 10 }}>✔ Shop uy tín</span>
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {tagsArray.map((tag: string) => (
                        <span key={tag} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, color: "var(--text-secondary)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: 12 }}>
                      <Link href={`/livestream/${room.user_id}`} className="button primary sm" style={{ width: "100%", justifyContent: "center", display: "flex", background: "linear-gradient(135deg, var(--color-peach), #ff8c5a)" }}>
                        📺 Vào phòng
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
