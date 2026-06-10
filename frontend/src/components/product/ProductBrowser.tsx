"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import ProductGrid from "@/components/product/ProductGrid";
import { useListing } from "@/lib/hooks/useListing";
import { formatPrice } from "@/lib/utils";
import styles from "./ProductBrowser.module.css";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { showToast } from "@/components/toast";
import { LocationPicker } from "@/components/location-picker";

export function ProductBrowserContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const searchParamVal = searchParams ? (searchParams.get("search") || "") : "";
  const [search, setSearch] = useState(searchParamVal);

  useEffect(() => {
    if (searchParams) {
      setSearch(searchParams.get("search") || "");
    }
  }, [searchParams]);
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationMethod, setLocationMethod] = useState<"gps" | "ip" | "profile" | "local" | "map" | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [showMapPicker, setShowMapPicker] = useState(false);

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
          console.error("ProductBrowser: IP Geolocation failed, using DUT default:", err);
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
          console.log("ProductBrowser: GPS blocked or failed, falling back to IP Geolocation:", error.message);
          void fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const { listings, loading, error, refetch } = useListing({
    search,
    lat: nearMe && userCoords ? userCoords.lat : undefined,
    lng: nearMe && userCoords ? userCoords.lng : undefined,
    radius_km: nearMe && userCoords ? radiusKm : undefined,
  });

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

        {/* Proximity Filter Panel */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--bg-inset)",
          padding: "12px 14px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          marginTop: 10,
          marginBottom: 10
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "600", cursor: "pointer", color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={nearMe}
              onChange={(e) => handleNearMeToggle(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            📍 Tìm quanh đây
          </label>

          {nearMe && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  <option value={2}>Bán kính 2 km</option>
                  <option value={5}>Bán kính 5 km</option>
                  <option value={10}>Bán kính 10 km</option>
                  <option value={25}>Bán kính 25 km</option>
                  <option value={50}>Bán kính 50 km</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className={`button ${showMapPicker ? "primary" : "secondary"} sm`}
                  style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                >
                  🗺️ {showMapPicker ? "Đóng bản đồ" : "Chọn vị trí trên bản đồ"}
                </button>

                {locatingUser ? (
                  <span style={{ fontSize: 12, color: "var(--accent)", fontStyle: "italic" }}>
                    ⏳ Đang xác định vị trí (GPS/IP)...
                  </span>
                ) : userCoords ? (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    (Định vị: {locationMethod === "gps" ? "GPS" : locationMethod === "ip" ? `IP: ${locationLabel}` : locationMethod === "profile" ? "Hồ sơ" : locationMethod === "local" ? "Đã lưu thiết bị" : "Bản đồ"}: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--danger)" }}>
                    ❌ Không thể xác định vị trí
                  </span>
                )}
              </div>

              {showMapPicker && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, background: "var(--bg-card)", padding: 12, borderRadius: "var(--radius-md)" }}>
                  <LocationPicker
                    value={userCoords ? { lat: userCoords.lat, lng: userCoords.lng, address: locationLabel } : null}
                    onChange={async (loc) => {
                      setUserCoords({ lat: loc.lat, lng: loc.lng });
                      setLocationMethod("map");
                      setLocationLabel(loc.address || "Vị trí chọn từ bản đồ");
                      
                      // Save coordinates
                      if (token) {
                        try {
                          await api.updateProfile(token, { lat: loc.lat, lng: loc.lng });
                          showToast("Đã cập nhật vị trí tìm kiếm vào hồ sơ của bạn!", "success");
                        } catch (err) {
                          console.error("Failed to update profile coordinates:", err);
                          showToast("Lỗi khi lưu vị trí vào hồ sơ.", "danger");
                        }
                      } else {
                        localStorage.setItem("search_lat", String(loc.lat));
                        localStorage.setItem("search_lng", String(loc.lng));
                        showToast("Đã lưu vị trí tìm kiếm trên thiết bị này!", "success");
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
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

export function ProductBrowser() {
  return (
    <Suspense fallback={<div className={styles.empty}>Đang tải danh mục sản phẩm...</div>}>
      <ProductBrowserContent />
    </Suspense>
  );
}

export default ProductBrowser;
