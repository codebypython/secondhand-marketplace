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

// We extract MapEvents to a separate component to use hooks properly
function MapEventsHandler({ onChange, currentSymbolType }: { onChange: (loc: { lat: number; lng: number; symbol_type: string }) => void; currentSymbolType: string }) {
  const { useMapEvents } = require("react-leaflet");
  
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng, symbol_type: currentSymbolType });
    },
  });
  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [legends, setLegends] = useState<MapLegend[]>([]);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const defaultCenter = { lat: 21.0285, lng: 105.8542 }; // Hanoi

  useEffect(() => {
    void initLeafletIcon();
    setMounted(true);
    void api.listMapLegends().then((data) => {
      setLegends(data);
    }).catch(err => {
      console.error("Failed to load map legends:", err);
    });
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

  if (!mounted) return <div style={{ height: 300, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map...</div>;

  const center = value ? { lat: value.lat, lng: value.lng } : defaultCenter;
  const currentSymbolType = value?.symbol_type || "STANDARD";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ height: 300, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {value && <Marker position={{ lat: value.lat, lng: value.lng }} icon={customIcon || undefined} />}
          <MapEventsHandler onChange={onChange} currentSymbolType={currentSymbolType} />
        </MapContainer>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nhấp vào bản đồ để chọn vị trí giao dịch.</p>
      
      <div className="field" style={{ margin: "4px 0 0 0" }}>
        <label htmlFor="symbol-type" style={{ fontSize: 13, fontWeight: "600", marginBottom: 6, display: "block" }}>Loại địa điểm (Ký hiệu hiển thị)</label>
        <select
          id="symbol-type"
          value={currentSymbolType}
          onChange={(e) => {
            if (value) {
              onChange({ ...value, symbol_type: e.target.value });
            } else {
              // If no location selected on map yet, set a default center coordinate with the selected symbol type
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
