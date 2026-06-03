"use client";

import Link from "next/link";
import ProductBrowser from "@/components/product/ProductBrowser";

export default function HomePage() {
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
        <div style={{ width: "100%" }}>
          <ProductBrowser />
        </div>
      </section>
    </>
  );
}
