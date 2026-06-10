"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { MapLegend } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationDisplayMapProps {
  lat: number;
  lng: number;
  address: string;
  symbol_type: string;
  legends: MapLegend[];
  activeLegend: {
    icon: string;
    name: string;
    description: string;
    color: string;
  };
}

export default function LocationDisplayMap({
  lat,
  lng,
  address,
  symbol_type,
  legends,
  activeLegend,
}: LocationDisplayMapProps) {
  const [customIcon, setCustomIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
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
  }, [symbol_type, legends]);

  return (
    <MapContainer center={{ lat, lng }} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {customIcon && (
        <Marker position={{ lat, lng }} icon={customIcon}>
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
      )}
    </MapContainer>
  );
}
