"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { MapLegend } from "@/lib/types";

// Dynamic import of the map component, disabling SSR
const LocationPickerMap = dynamic(() => import("./location-picker-map"), { ssr: false });

interface LocationPickerProps {
  value: { lat: number; lng: number; address?: string; symbol_type?: string } | null;
  onChange: (location: { lat: number; lng: number; address?: string; symbol_type?: string }) => void;
  zoom?: number;
}

export function LocationPicker({ value, onChange, zoom = 13 }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [locating, setLocating] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const defaultCenter = { lat: 16.0748, lng: 108.1532 }; // Danang University of Technology (DUT)

  useEffect(() => {
    setMounted(true);
    void api.listMapLegends().then((data) => {
      setLegends(data);
    }).catch(err => {
      console.error("Failed to load map legends:", err);
    });

    // Auto-locate on mount if no value is set
    if (!value && typeof window !== "undefined") {
      const fallbackToIPOnMount = async () => {
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          if (ipData && ipData.latitude && ipData.longitude) {
            const lat = ipData.latitude;
            const lng = ipData.longitude;
            let address = ipData.city || "Vị trí xác định qua IP";
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                headers: { "User-Agent": "SecondhandMarketplaceApp/1.0" }
              });
              const data = await res.json();
              address = data?.display_name || address;
            } catch (err) {
              console.error("Failed to reverse geocode IP location on mount:", err);
            }
            onChange({ lat, lng, address, symbol_type: "STANDARD" });
          }
        } catch (err) {
          console.log("Auto-location IP fallback on mount failed:", err);
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            onChange({ lat, lng, symbol_type: "STANDARD" });
          },
          (err) => {
            console.log("Auto-location on mount failed or denied, trying IP fallback...", err);
            void fallbackToIPOnMount();
          },
          { enableHighAccuracy: false, timeout: 3000 }
        );
      } else {
        void fallbackToIPOnMount();
      }
    }
  }, []);

  const currentSymbolType = value?.symbol_type || "STANDARD";

  const handleSelectMockLocation = async (city: string, lat: number, lng: number) => {
    setAddressLoading(true);
    let address = `Khu vực trung tâm ${city}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { "User-Agent": "SecondhandMarketplaceApp/1.0" }
      });
      const data = await res.json();
      address = data?.display_name || address;
    } catch (err) {
      console.error(`Failed to geocode mock location for ${city}:`, err);
    }
    onChange({ lat, lng, address, symbol_type: currentSymbolType });
    setAddressLoading(false);
  };

  const handleLocateUser = () => {
    setLocating(true);
    setAddressLoading(true);

    const fallbackToIP = async () => {
      console.log("Attempting IP Geolocation fallback...");
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        if (ipData && ipData.latitude && ipData.longitude) {
          const lat = ipData.latitude;
          const lng = ipData.longitude;
          
          let address = ipData.city || "Vị trí xác định qua IP";
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { "User-Agent": "SecondhandMarketplaceApp/1.0" }
            });
            const data = await res.json();
            address = data?.display_name || address;
          } catch (err) {
            console.error("Failed to reverse geocode IP location:", err);
          }
          
          onChange({ lat, lng, address, symbol_type: currentSymbolType });
        } else {
          throw new Error("Invalid IP location data");
        }
      } catch (err) {
        console.error("IP Geolocation failed:", err);
        alert("Không thể tự động xác định vị trí qua GPS lẫn IP. Vui lòng chọn thủ công trên bản đồ hoặc dùng các nút chọn nhanh.");
      } finally {
        setLocating(false);
        setAddressLoading(false);
      }
    };

    if (typeof window === "undefined" || !navigator.geolocation) {
      void fallbackToIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        let address = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { "User-Agent": "SecondhandMarketplaceApp/1.0" }
          });
          const data = await res.json();
          address = data?.display_name || "";
        } catch (err) {
          console.error("Failed to reverse geocode GPS location:", err);
        }
        
        onChange({ lat, lng, address, symbol_type: currentSymbolType });
        setLocating(false);
        setAddressLoading(false);
      },
      (error) => {
        console.log("GPS blocked or failed, falling back to IP Geolocation:", error.message);
        void fallbackToIP();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  if (!mounted) return <div style={{ height: 300, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map...</div>;

  const center = value ? { lat: value.lat, lng: value.lng } : defaultCenter;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          className="button secondary sm"
          onClick={handleLocateUser}
          disabled={locating}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 12px" }}
        >
          {locating ? "⏳ Đang định vị..." : "🎯 Định vị tự động (GPS/IP)"}
        </button>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 4 }}>Chọn nhanh:</span>
          <button
            type="button"
            className="button ghost sm"
            onClick={() => void handleSelectMockLocation("Đà Nẵng", 16.0544, 108.2022)}
            style={{ fontSize: 12, padding: "4px 8px", background: "var(--bg-inset)" }}
          >
            Đà Nẵng
          </button>
          <button
            type="button"
            className="button ghost sm"
            onClick={() => void handleSelectMockLocation("Hà Nội", 21.0285, 105.8542)}
            style={{ fontSize: 12, padding: "4px 8px", background: "var(--bg-inset)" }}
          >
            Hà Nội
          </button>
          <button
            type="button"
            className="button ghost sm"
            onClick={() => void handleSelectMockLocation("TP. HCM", 10.776, 106.701)}
            style={{ fontSize: 12, padding: "4px 8px", background: "var(--bg-inset)" }}
          >
            TP. HCM
          </button>
        </div>
      </div>

      <div style={{ height: 300, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <LocationPickerMap
          center={center}
          zoom={zoom}
          value={value}
          onChange={onChange}
          currentSymbolType={currentSymbolType}
          legends={legends}
          setAddressLoading={setAddressLoading}
        />
      </div>

      {addressLoading && (
        <div style={{ fontSize: 12, color: "var(--accent)", fontStyle: "italic", margin: "2px 0" }}>
          ⏳ Đang xác định địa chỉ của vị trí được chọn...
        </div>
      )}

      {value?.address && (
        <div style={{ 
          padding: "10px 14px", 
          background: "var(--bg-inset)", 
          borderRadius: "var(--radius)", 
          fontSize: 13, 
          border: "1px solid var(--border)",
          color: "var(--text)",
          lineHeight: 1.4
        }}>
          📍 <strong>Địa chỉ đã chọn:</strong> {value.address}
        </div>
      )}
      
      <div className="field" style={{ margin: "4px 0 0 0" }}>
        <label htmlFor="symbol-type" style={{ fontSize: 13, fontWeight: "600", marginBottom: 6, display: "block" }}>Loại địa điểm (Ký hiệu hiển thị)</label>
        <select
          id="symbol-type"
          value={currentSymbolType}
          onChange={(e) => {
            if (value) {
              onChange({ ...value, symbol_type: e.target.value });
            } else {
              onChange({ lat: defaultCenter.lat, lng: defaultCenter.lng, symbol_type: e.target.value });
            }
          }}
          style={{ 
            width: "100%", 
            padding: "8px 12px", 
            borderRadius: "var(--radius)", 
            border: "1px solid var(--border)", 
            background: "var(--bg-card)", 
            color: "var(--text)", 
            fontSize: 14 
          }}
        >
          {legends.map((leg) => (
            <option key={leg.id} value={leg.symbol_type}>
              {leg.icon} {leg.name}
            </option>
          ))}
        </select>
        
        {value && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0 0", fontStyle: "italic" }}>
            💡 <strong>Mô tả ký hiệu:</strong> {legends.find(l => l.symbol_type === currentSymbolType)?.description || "Địa điểm giao dịch thường."}
          </p>
        )}
      </div>
    </div>
  );
}
