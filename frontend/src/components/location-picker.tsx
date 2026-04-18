"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

// We need to dynamically import leaflet components to avoid SSR errors
import dynamic from "next/dynamic";

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
  value: { lat: number; lng: number; address?: string } | null;
  onChange: (location: { lat: number; lng: number; address?: string }) => void;
}

// We extract MapEvents to a separate component to use hooks properly
function MapEventsHandler({ onChange }: { onChange: (loc: { lat: number; lng: number }) => void }) {
  // Use dynamic import for the hook or just assume it's available since this component
  // is only rendered inside MapContainer which is client-only.
  // Actually, we can just use the hook from react-leaflet if we import it normally.
  // But since the parent is dynamic, we can't easily import it here.
  // Let's use the provided way but fix the hook rule.
  
  const { useMapEvents } = require("react-leaflet");
  
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const defaultCenter = { lat: 21.0285, lng: 105.8542 }; // Hanoi

  useEffect(() => {
    void initLeafletIcon();
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ height: 300, background: "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map...</div>;

  const center = value ? { lat: value.lat, lng: value.lng } : defaultCenter;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 300, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {value && <Marker position={{ lat: value.lat, lng: value.lng }} />}
          <MapEventsHandler onChange={onChange} />
        </MapContainer>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>Nhấp vào bản đồ để chọn vị trí giao dịch.</p>
    </div>
  );
}
