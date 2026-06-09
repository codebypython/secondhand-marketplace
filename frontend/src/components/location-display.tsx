"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { MapLegend } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((mod) => mod.Tooltip), { ssr: false });

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

interface LocationDisplayProps {
  location: any;
}

export function LocationDisplay({ location }: LocationDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const [showLegendPanel, setShowLegendPanel] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initLeafletIcon();
      
      try {
        const data = await api.listMapLegends();
        setLegends(data);
      } catch (err) {
        console.error("Failed to load map legends in display:", err);
      }
      
      setMounted(true);
    };
    void init();
  }, []);

  // Parse location details
  let lat = 0;
  let lng = 0;
  let address = "";
  let symbol_type = "STANDARD";

  if (location) {
    if (typeof location === "object") {
      lat = Number(location.lat);
      lng = Number(location.lng);
      address = location.address || location.city || "Địa điểm đề xuất";
      symbol_type = location.symbol_type || "STANDARD";
    } else {
      try {
        const parsed = JSON.parse(location);
        lat = Number(parsed.lat);
        lng = Number(parsed.lng);
        address = parsed.address || parsed.city || "Địa điểm đề xuất";
        symbol_type = parsed.symbol_type || "STANDARD";
      } catch {
        // Fallback
      }
    }
  }

  // Generate custom icon dynamically when legends and symbol_type are loaded
  useEffect(() => {
    if (!mounted || !lat || !lng) return;
    const updateIcon = async () => {
      try {
        const L = await import("leaflet");
        const legend = legends.find(l => l.symbol_type === symbol_type) || {
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
        console.error("Error setting display icon:", err);
      }
    };
    void updateIcon();
  }, [symbol_type, legends, mounted, lat, lng]);

  if (!location || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

  if (!mounted) {
    return (
      <div style={{ height: 250, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius)" }}>
        Đang tải bản đồ...
      </div>
    );
  }

  const activeLegend = legends.find(l => l.symbol_type === symbol_type) || {
    icon: "📍",
    name: "Địa điểm giao dịch",
    description: "Địa điểm giao dịch thỏa thuận giữa hai bên.",
    color: "#6366f1"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Map Container */}
      <div style={{ height: 260, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
        <MapContainer center={{ lat, lng }} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={{ lat, lng }} icon={customIcon || undefined}>
            <Popup>
              <div style={{ padding: "4px", fontSize: "13px", maxWidth: 220 }}>
                <strong style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span>{activeLegend.icon}</span> 
                  <span>{activeLegend.name}</span>
                </strong>
                <p style={{ margin: "4px 0 6px 0", color: "var(--text)", fontWeight: 500 }}>📍 {address}</p>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4, fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  {activeLegend.description}
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -32]}>
              <span style={{ fontSize: "11px", fontWeight: "bold" }}>{activeLegend.icon} {address}</span>
            </Tooltip>
          </Marker>
        </MapContainer>
      </div>

      {/* Location Details and Legend Trigger */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
          📍 Địa chỉ giao dịch: <strong>{address}</strong>
          {symbol_type !== "STANDARD" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: "var(--bg-inset)", fontSize: 11, fontWeight: "600", color: "var(--text)" }}>
              {activeLegend.icon} {activeLegend.name}
            </span>
          )}
        </span>
        <button 
          type="button" 
          className="button ghost sm" 
          onClick={() => setShowLegendPanel(!showLegendPanel)}
          style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
        >
          {showLegendPanel ? "🙈 Ẩn chú thích" : "🗺️ Chú thích ký hiệu"}
        </button>
      </div>

      {/* Interactive Map Legends Panel */}
      {showLegendPanel && (
        <div 
          style={{ 
            padding: 12, 
            background: "var(--bg-card)", 
            border: "1px solid var(--border)", 
            borderRadius: "var(--radius)",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <strong style={{ fontSize: 12, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📚 Ý nghĩa các ký hiệu bản đồ
          </strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {legends.map((leg) => (
              <div 
                key={leg.id} 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 4, 
                  padding: 8,
                  borderRadius: 6,
                  background: leg.symbol_type === symbol_type ? "rgba(99, 102, 241, 0.08)" : "var(--bg-inset)",
                  border: leg.symbol_type === symbol_type ? `1px solid ${leg.color}` : "1px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: "50%", 
                    background: leg.color, 
                    color: "white", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: 12
                  }}>
                    {leg.icon}
                  </span>
                  <strong style={{ fontSize: 12, color: "var(--text)" }}>{leg.name}</strong>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                  {leg.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
