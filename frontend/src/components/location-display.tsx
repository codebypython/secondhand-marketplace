"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { MapLegend } from "@/lib/types";

// Dynamically import the map component, disabling SSR
const LocationDisplayMap = dynamic(() => import("./location-display-map"), { ssr: false });

interface LocationDisplayProps {
  location: any;
}

export function LocationDisplay({ location }: LocationDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [showLegendPanel, setShowLegendPanel] = useState(false);

  useEffect(() => {
    const init = async () => {
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
        <LocationDisplayMap
          lat={lat}
          lng={lng}
          address={address}
          symbol_type={symbol_type}
          legends={legends}
          activeLegend={activeLegend}
        />
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
