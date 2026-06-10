"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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

interface LocationPickerMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  value: { lat: number; lng: number; address?: string; symbol_type?: string } | null;
  onChange: (location: { lat: number; lng: number; address?: string; symbol_type?: string }) => void;
  currentSymbolType: string;
  legends: MapLegend[];
  setAddressLoading: (loading: boolean) => void;
}

// ChangeMapCenter helper
function ChangeMapCenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

// MapEventsHandler helper
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
  useMapEvents({
    async click(e) {
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

export default function LocationPickerMap({
  center,
  zoom,
  value,
  onChange,
  currentSymbolType,
  legends,
  setAddressLoading,
}: LocationPickerMapProps) {
  const [customIcon, setCustomIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    const legend = legends.find(l => l.symbol_type === currentSymbolType) || {
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
  }, [currentSymbolType, legends]);

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeMapCenter center={center} zoom={zoom} />
      {value && customIcon && (
        <Marker position={{ lat: value.lat, lng: value.lng }} icon={customIcon} />
      )}
      <MapEventsHandler 
        onChange={onChange} 
        currentSymbolType={currentSymbolType}
        onAddressFetchStart={() => setAddressLoading(true)}
        onAddressFetchEnd={() => setAddressLoading(false)}
      />
    </MapContainer>
  );
}
