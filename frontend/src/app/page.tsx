"use client";

import Link from "next/link";
import ProductBrowser from "@/components/product/ProductBrowser";

export default function HomePage() {
  return (
    <div className="stack-lg" style={{ animation: "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
      {/* Premium Hero Section */}
      <section className="glass-panel" style={{
        padding: "64px 48px",
        borderRadius: "var(--radius-lg)",
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: "40px",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        background: "var(--glass-bg)"
      }}>
        {/* Glow behind hero */}
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-20%",
          width: "80%",
          height: "180%",
          background: "radial-gradient(circle, rgba(249, 177, 122, 0.12) 0%, transparent 70%)",
          zIndex: 0,
          pointerEvents: "none"
        }} />
        
        <div className="stack-md" style={{ zIndex: 1, position: "relative" }}>
          <div className="inline-sm">
            <span className="badge badge-accent badge-pulse" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
              ⚡ Nền tảng mua bán tin cậy
            </span>
          </div>
          
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-1.5px",
            color: "var(--text)",
            fontFamily: "var(--font-sans)"
          }}>
            Mua bán đồ cũ,<br />
            <span style={{
              background: "linear-gradient(135deg, var(--color-peach), #ff8c5a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>đơn giản và an toàn.</span>
          </h1>
          
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "16px",
            lineHeight: "1.7",
            maxWidth: "520px"
          }}>
            Đăng tin miễn phí trong 30 giây, thương lượng trực tiếp qua chat, gọi video xem thực tế và hẹn gặp giao dịch an toàn.
          </p>
          
          <div className="hero-actions" style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <Link className="button primary" href="/listings/new" style={{ minWidth: "140px" }}>＋ Đăng tin mới</Link>
            <Link className="button secondary" href="/dashboard/offers">Xem giao dịch</Link>
            <Link className="button ghost" href="/inbox">💬 Trò chuyện</Link>
          </div>
        </div>

        {/* Decorative graphic illustration pane */}
        <div style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          zIndex: 1
        }} className="responsive-hide-tablet">
          <div style={{
            width: "280px",
            height: "280px",
            borderRadius: "40px",
            background: "linear-gradient(135deg, rgba(249, 177, 122, 0.15), rgba(103, 111, 157, 0.25))",
            border: "1px solid rgba(249, 177, 122, 0.3)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "var(--shadow-lg), 0 0 40px rgba(249, 177, 122, 0.1)",
            transform: "rotate(-6deg)"
          }}>
            <div style={{ fontSize: "72px", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.3))" }}>🏷️</div>
            <div style={{
              position: "absolute",
              bottom: "20px",
              padding: "8px 16px",
              background: "rgba(23, 24, 38, 0.8)",
              backdropFilter: "blur(8px)",
              borderRadius: "20px",
              border: "1px solid var(--border)",
              color: "var(--color-peach)",
              fontWeight: 700,
              fontSize: "13px"
            }}>
              Chợ Đồ Cũ Online
            </div>
            
            {/* Float badge 1 */}
            <div style={{
              position: "absolute",
              top: "-15px",
              left: "-15px",
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "10px",
              boxShadow: "var(--shadow-sm)",
              transform: "rotate(12deg)",
              fontSize: "24px"
            }} title="Định vị quanh đây">
              📍
            </div>

            {/* Float badge 2 */}
            <div style={{
              position: "absolute",
              top: "40px",
              right: "-25px",
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "10px",
              boxShadow: "var(--shadow-sm)",
              transform: "rotate(-15deg)",
              fontSize: "24px"
            }} title="Gọi video kiểm tra">
              🎥
            </div>
          </div>
        </div>
      </section>

      {/* Product Discovery Area */}
      <section style={{ width: "100%" }}>
        <ProductBrowser />
      </section>
    </div>
  );
}
