"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import ProductGrid from "@/components/product/ProductGrid";
import { useListing } from "@/lib/hooks/useListing";
import styles from "./ProductBrowser.module.css";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { showToast } from "@/components/toast";
import { LocationPicker } from "@/components/location-picker";
import type { Category } from "@/lib/types";

export function ProductBrowserContent() {
  const router = useRouter();
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const searchParamVal = searchParams ? (searchParams.get("search") || "") : "";
  const [search, setSearch] = useState(searchParamVal);

  useEffect(() => {
    if (searchParams) {
      setSearch(searchParams.get("search") || "");
    }
  }, [searchParams]);

  // Proximity states
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationMethod, setLocationMethod] = useState<"gps" | "ip" | "profile" | "local" | "map" | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");

  // Categories list state
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter states
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Load user profile location / local coordinates on mount
  useEffect(() => {
    if (user?.profile?.lat && user?.profile?.lng) {
      setUserCoords({ lat: Number(user.profile.lat), lng: Number(user.profile.lng) });
      setLocationMethod("profile");
      setLocationLabel("Hồ sơ");
    } else if (typeof window !== "undefined") {
      const savedLat = localStorage.getItem("search_lat");
      const savedLng = localStorage.getItem("search_lng");
      if (savedLat && savedLng) {
        setUserCoords({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
        setLocationMethod("local");
        setLocationLabel("Thiết bị");
      }
    }
  }, [user]);

  // Load categories
  useEffect(() => {
    let active = true;
    api.listCategories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch((err) => console.error("Failed to load categories:", err));
    return () => {
      active = false;
    };
  }, []);

  const handleNearMeToggle = (checked: boolean) => {
    setNearMe(checked);
    if (checked && !userCoords) {
      setLocatingUser(true);

      const fallbackToIP = async () => {
        console.log("ProductBrowser: Attempting IP Geolocation fallback...");
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          if (ipData && ipData.latitude && ipData.longitude) {
            setUserCoords({
              lat: ipData.latitude,
              lng: ipData.longitude
            });
            setLocationMethod("ip");
            setLocationLabel(ipData.city || "Vị trí mạng");
          } else {
            throw new Error("Invalid IP location data");
          }
        } catch (err) {
          console.error("ProductBrowser: IP Geolocation failed, using default:", err);
          setUserCoords({ lat: 16.0748, lng: 108.1532 });
          setLocationMethod("ip");
          setLocationLabel("Đại học Bách Khoa ĐN (Mặc định)");
        } finally {
          setLocatingUser(false);
        }
      };

      if (typeof window === "undefined" || !navigator.geolocation) {
        void fallbackToIP();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationMethod("gps");
          setLocationLabel("GPS");
          setLocatingUser(false);
        },
        (error) => {
          console.log("ProductBrowser: GPS failed, falling back to IP Geolocation:", error.message);
          void fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Fetch items based on Search, Coordinates (if nearMe is active)
  const { listings, loading, error, refetch } = useListing({
    search,
    lat: nearMe && userCoords ? userCoords.lat : undefined,
    lng: nearMe && userCoords ? userCoords.lng : undefined,
    radius_km: nearMe && userCoords ? radiusKm : undefined,
  });

  const mapZoom = useMemo(() => {
    if (!nearMe) return 13;
    if (radiusKm === 2) return 14;
    if (radiusKm === 5) return 13;
    if (radiusKm === 10) return 12;
    if (radiusKm === 25) return 10;
    if (radiusKm === 50) return 9;
    return 13;
  }, [radiusKm, nearMe]);

  // Pre-process categories into hierarchical list for the filter dropdown
  const categoriesDropdownList = useMemo(() => {
    const list: { id: string; name: string; isChild: boolean }[] = [];
    const parents = categories.filter((c) => !c.parent_id);
    parents.forEach((parent) => {
      list.push({ id: parent.id, name: parent.name, isChild: false });
      const children = categories.filter((c) => c.parent_id === parent.id);
      children.forEach((child) => {
        list.push({ id: child.id, name: `— ${child.name}`, isChild: true });
      });
    });
    return list;
  }, [categories]);

  // Client-side filtering & sorting of results
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // 1. Filter Category (recursive)
    if (filterCategory) {
      const targetCategory = categories.find((c) => c.id === filterCategory);
      if (targetCategory) {
        const categoryIds = [filterCategory];
        // If they chose a parent category, include all children categories in filter too
        if (!targetCategory.parent_id) {
          const children = categories.filter((c) => c.parent_id === filterCategory);
          children.forEach((c) => categoryIds.push(c.id));
        }
        result = result.filter((item) => item.category_id && categoryIds.includes(item.category_id));
      }
    }

    // 2. Filter Condition
    if (filterCondition) {
      result = result.filter((item) => item.condition === filterCondition);
    }

    // 3. Filter Price Range
    if (filterPrice) {
      result = result.filter((item) => {
        const p = parseFloat(item.price);
        if (filterPrice === "under_1m") return p < 1000000;
        if (filterPrice === "1m_5m") return p >= 1000000 && p <= 5000000;
        if (filterPrice === "5m_10m") return p >= 5000000 && p <= 10000000;
        if (filterPrice === "10m_20m") return p >= 10000000 && p <= 20000000;
        if (filterPrice === "over_20m") return p > 20000000;
        return true;
      });
    }

    // 4. Client-side Sort
    if (sortBy === "price_asc") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else {
      // "newest" is default (backend already sorts by created_at desc)
    }

    return result;
  }, [listings, filterCategory, filterCondition, filterPrice, sortBy, categories]);

  // Recalculate stats dynamically based on filtered results
  const stats = useMemo(() => {
    const available = filteredListings.filter((listing) => listing.status === "AVAILABLE").length;
    const sold = filteredListings.filter((listing) => listing.status === "SOLD").length;

    return [
      { label: "Đang bán", value: String(available) },
      { label: "Đã bán", value: String(sold) },
      { label: "Tổng số tin", value: String(filteredListings.length) },
    ];
  }, [filteredListings]);

  return (
    <section className={styles.splitLayout}>
      {/* CỘT TRÁI (1/3): Tìm kiếm & Bản đồ định vị */}
      <aside className={styles.leftColumn}>
        <div className={styles.searchFrame}>
          {/* Upper Section: Keyword Search */}
          <div className={styles.searchSection}>
            <h3 className={styles.sectionTitle}>🔍 Tìm kiếm sản phẩm</h3>
            <div className={styles.searchRow}>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập tên, mô tả, thương hiệu..."
              />
              <button
                className={styles.refreshButton}
                type="button"
                onClick={() => void refetch()}
              >
                Tải lại
              </button>
            </div>
          </div>

          {/* Lower Section: Location Map Picker */}
          <div className={styles.mapSection}>
            <div className={styles.mapHeader}>
              <label className={styles.proximityLabel}>
                <input
                  type="checkbox"
                  checked={nearMe}
                  onChange={(e) => handleNearMeToggle(e.target.checked)}
                  className={styles.proximityCheckbox}
                />
                📍 Tìm quanh đây
              </label>

              {nearMe && (
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className={styles.proximitySelect}
                >
                  <option value={2}>Bán kính 2 km</option>
                  <option value={5}>Bán kính 5 km</option>
                  <option value={10}>Bán kính 10 km</option>
                  <option value={25}>Bán kính 25 km</option>
                  <option value={50}>Bán kính 50 km</option>
                </select>
              )}
            </div>

            {nearMe && (
              <div className={styles.locationMeta}>
                {locatingUser ? (
                  <span className={styles.locatingText}>
                    ⏳ Đang xác định vị trí...
                  </span>
                ) : userCoords ? (
                  <span className={styles.locatedText}>
                    Vị trí ({locationMethod === "gps" ? "GPS" : locationMethod === "ip" ? `IP: ${locationLabel}` : locationMethod === "profile" ? "Hồ sơ" : locationMethod === "local" ? "Đã lưu" : "Bản đồ"}): {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                  </span>
                ) : (
                  <span className={styles.locateError}>
                    ❌ Lỗi định vị
                  </span>
                )}
              </div>
            )}

            <div className={styles.mapContainer}>
              <LocationPicker
                value={userCoords ? { lat: userCoords.lat, lng: userCoords.lng, address: locationLabel } : null}
                zoom={mapZoom}
                onChange={async (loc) => {
                  setUserCoords({ lat: loc.lat, lng: loc.lng });
                  setLocationMethod("map");
                  setLocationLabel(loc.address || "Chọn từ bản đồ");
                  
                  if (token) {
                    try {
                      await api.updateProfile(token, { lat: loc.lat, lng: loc.lng });
                      showToast("Đã lưu vị trí tìm kiếm vào hồ sơ!", "success");
                    } catch (err) {
                      console.error(err);
                    }
                  } else {
                    localStorage.setItem("search_lat", String(loc.lat));
                    localStorage.setItem("search_lng", String(loc.lng));
                    showToast("Đã lưu vị trí trên thiết bị!", "success");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* CỘT PHẢI (2/3): Thanh bộ lọc nhanh & Lưới sản phẩm */}
      <main className={styles.rightColumn}>
        {/* Sticky Filters row */}
        <div className={styles.quickFiltersBar}>
          <div className={styles.filterGroup}>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Tất cả danh mục</option>
              {categoriesDropdownList.map((cat) => (
                <option 
                  key={cat.id} 
                  value={cat.id}
                  style={{
                    fontWeight: cat.isChild ? "normal" : "bold",
                    color: cat.isChild ? "var(--text-secondary)" : "var(--accent)"
                  }}
                >
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Tất cả tình trạng</option>
              <option value="NEW">Mới</option>
              <option value="LIKE_NEW">Như mới</option>
              <option value="USED">Đã dùng</option>
              <option value="DAMAGED">Hỏng / Trầy xước</option>
            </select>

            <select
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Tất cả mức giá</option>
              <option value="under_1m">Dưới 1 triệu ₫</option>
              <option value="1m_5m">1 - 5 triệu ₫</option>
              <option value="5m_10m">5 - 10 triệu ₫</option>
              <option value="10m_20m">10 - 20 triệu ₫</option>
              <option value="over_20m">Trên 20 triệu ₫</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </div>

          <div className={styles.statsGroup}>
            {stats.map((item) => (
              <div key={item.label} className={styles.statChip}>
                <span className={styles.statLabel}>{item.label}:</span>
                <span className={styles.statValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className={styles.error}>
            {error}
            <div style={{ marginTop: 8 }}>
              <button 
                type="button" 
                onClick={() => void refetch()} 
                style={{ textDecoration: "underline", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : null}

        {/* Results grid */}
        <div className={styles.resultsArea}>
          <ProductGrid
            listings={filteredListings}
            loading={loading}
            onProductClick={(listing) => router.push(`/listings/${listing.id}`)}
          />

          {!loading && filteredListings.length === 0 ? (
            <div className={styles.empty}>
              Không tìm thấy sản phẩm phù hợp. Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
            </div>
          ) : null}
        </div>

        {!loading && filteredListings.length > 0 && (
          <div className={styles.countFooter}>
            Đang hiển thị {filteredListings.length} sản phẩm
          </div>
        )}
      </main>
    </section>
  );
}

export function ProductBrowser() {
  return (
    <Suspense fallback={<div className={styles.empty}>Đang tải danh mục sản phẩm...</div>}>
      <ProductBrowserContent />
    </Suspense>
  );
}

export default ProductBrowser;
