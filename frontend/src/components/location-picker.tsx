"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

// We need to dynamically import leaflet components to avoid SSR errors
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { MapLegend } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

// Fix leaflet default icon issue in Next.js
const initLeafletIcon = async () => {
  if (typeof window === "undefined") return;
  const L = await import("leaflet");
  // @ts-expect-error - Leaflet types might not include private properties
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface LocationPickerProps {
  value: { lat: number; lng: number; address?: string; symbol_type?: string } | null;
  onChange: (location: { lat: number; lng: number; address?: string; symbol_type?: string }) => void;
}

// Helper component to programmatically pan map view when coordinates change
function ChangeMapCenter({ center }: { center: { lat: number; lng: number } }) {
  const { useMap } = require("react-leaflet");
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

// We extract MapEvents to a separate component to use hooks properly
function MapEventsHandler({ 
  onChange, 
  currentSymbolType,
  onAddressFetchStart,
  onAddressFetchEnd
}: { 
  onChange: (loc: { lat: number; lng: number; address?: string; symbol_type: string }) => void; 
  currentSymbolType: string;
  onAddressFetchStart?: () => void;
  onAddressFetchEnd?: () => void;
}) {
  const { useMapEvents } = require("react-leaflet");
  
  useMapEvents({
    async click(e: { latlng: { lat: number; lng: number } }) {
      if (onAddressFetchStart) onAddressFetchStart();
      let address = "";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`, {
          headers: { "User-Agent": "SecondhandMarketplaceApp/1.0" }
        });
        const data = await res.json();
        address = data?.display_name || "";
      } catch (err) {
        console.error("Failed to reverse geocode click:", err);
      }
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng, address, symbol_type: currentSymbolType });
      if (onAddressFetchEnd) onAddressFetchEnd();
    },
  });
  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const [locating, setLocating] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const defaultCenter = { lat: 16.0748, lng: 108.1532 }; // Danang University of Technology (DUT)

  useEffect(() => {
    void initLeafletIcon();
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

  // Update custom icon dynamically when symbol_type changes
  useEffect(() => {
    if (!mounted) return;
    const updateIcon = async () => {
      try {
        const L = await import("leaflet");
        const currentSymbol = value?.symbol_type || "STANDARD";
        const legend = legends.find(l => l.symbol_type === currentSymbol) || {
          icon: "📍",
          color: "#6366f1"
        };

        const icon = L.divIcon({
          html: `
            <div style="
               background-color: ${legend.color};
               color: white;
               width: 32px;
               height: 32px;
               border-radius: 50%;
               border: 2px solid white;
               box-shadow: 0 2px 6px rgba(0,0,0,0.3);
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: 16px;
             ">
               ${legend.icon}
             </div>
           `,
          className: "custom-leaflet-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });
        setCustomIcon(icon);
      } catch (err) {
        console.error("Error setting custom map icon:", err);
      }
    };
    void updateIcon();
  }, [value?.symbol_type, legends, mounted]);

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
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeMapCenter center={center} />
          {value && <Marker position={{ lat: value.lat, lng: value.lng }} icon={customIcon || undefined} />}
          <MapEventsHandler 
            onChange={onChange} 
            currentSymbolType={currentSymbolType}
            onAddressFetchStart={() => setAddressLoading(true)}
            onAddressFetchEnd={() => setAddressLoading(false)}
          />
        </MapContainer>
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
