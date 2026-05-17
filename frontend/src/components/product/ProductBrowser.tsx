"use client";

import { useMemo, useState } from "react";

import ProductGrid from "@/components/product/ProductGrid";
import { useListing } from "@/lib/hooks/useListing";
import { formatPrice } from "@/lib/utils";
import styles from "./ProductBrowser.module.css";

export function ProductBrowser() {
  const [search, setSearch] = useState("");
  const { listings, loading, error, refetch } = useListing({ search });

  const stats = useMemo(() => {
    const available = listings.filter((listing) => listing.status === "AVAILABLE").length;
    const sold = listings.filter((listing) => listing.status === "SOLD").length;

    return [
      { label: "Đang bán", value: String(available) },
      { label: "Đã bán", value: String(sold) },
      { label: "Tổng tin", value: String(listings.length) },
    ];
  }, [listings]);

  return (
    <section className={styles.wrapper}>
      <div className={styles.topBar}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ color: "var(--text)", fontFamily: "var(--font-family-sans)" }}>Khám phá sản phẩm</h2>
          <p style={{ color: "var(--text-muted)" }}>Tìm kiếm và khám phá các tin đăng mới nhất</p>
        </div>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, mô tả, thương hiệu..."
          />
          <button
            className={styles.refreshButton}
            type="button"
            onClick={() => void refetch()}
          >
            Refresh
          </button>
        </div>

        <div className={styles.stats}>
          {stats.map((item) => (
            <div key={item.label} className={styles.statCard}>
              <div className={styles.statValue}>{item.value}</div>
              <div className={styles.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className={styles.error}>
          {error}
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => void refetch()} style={{ textDecoration: "underline", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
              Thử lại
            </button>
          </div>
        </div>
      ) : null}

      <ProductGrid listings={listings} loading={loading} />

      {!loading && listings.length === 0 ? (
        <div className={styles.empty}>
          Không có kết quả phù hợp. Hãy thử từ khóa khác hoặc quay lại sau.
        </div>
      ) : null}

      <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
        Giá hiển thị từ {listings[0] ? formatPrice(listings[0].price) : "0"} ₫
      </div>
    </section>
  );
}

export default ProductBrowser;
