"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

// Fix default Leaflet icon broken in bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { lat: number | null; lng: number | null }) => void;
}

// Handles map click events to set marker position
interface ClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}
function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      const newLat = Math.round(e.latlng.lat * 10000) / 10000;
      const newLng = Math.round(e.latlng.lng * 10000) / 10000;
      onMapClick(newLat, newLng);
    },
  });
  return null;
}

// Pans the map when manual coords are entered
interface PanControllerProps {
  target: { lat: number; lng: number } | null;
}
function PanController({ target }: PanControllerProps) {
  const map = useMap();
  if (target) {
    map.panTo([target.lat, target.lng]);
  }
  return null;
}

export default function MapPicker({
  latitude,
  longitude,
  onChange,
}: MapPickerProps) {
  const [lat, setLat] = useState<string>(latitude?.toString() || "");
  const [lng, setLng] = useState<string>(longitude?.toString() || "");
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat.toString());
    setLng(newLng.toString());
    onChange({ lat: newLat, lng: newLng });
  };

  const handleManualChange = (field: "lat" | "lng", value: string) => {
    if (field === "lat") {
      setLat(value);
    } else {
      setLng(value);
    }
    const numLat = field === "lat" ? parseFloat(value) : parseFloat(lat);
    const numLng = field === "lng" ? parseFloat(value) : parseFloat(lng);
    const validLat = isNaN(numLat) ? null : numLat;
    const validLng = isNaN(numLng) ? null : numLng;
    onChange({ lat: validLat, lng: validLng });
    // Pan map to manual coords if both valid
    if (validLat !== null && validLng !== null) {
      setPanTarget({ lat: validLat, lng: validLng });
    }
  };

  const centerLat = latitude || -23.5;
  const centerLng = longitude || -48.0;
  const defaultZoom = latitude && longitude ? 15 : 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <span>Clique no mapa para marcar a localizacao do imovel</span>
      </div>

      <div className="h-64 rounded-xl border border-border/50 overflow-hidden">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={defaultZoom}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickHandler onMapClick={handleMapClick} />
          <PanController target={panTarget} />
          {latitude && longitude && (
            <Marker
              position={[latitude, longitude]}
              draggable
              eventHandlers={{
                dragend(e) {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  const newLat = Math.round(pos.lat * 10000) / 10000;
                  const newLng = Math.round(pos.lng * 10000) / 10000;
                  setLat(newLat.toString());
                  setLng(newLng.toString());
                  onChange({ lat: newLat, lng: newLng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Latitude
          </label>
          <Input
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => handleManualChange("lat", e.target.value)}
            placeholder="-23.5920"
            className="bg-secondary/50 border-border/50 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Longitude
          </label>
          <Input
            type="number"
            step="0.0001"
            value={lng}
            onChange={(e) => handleManualChange("lng", e.target.value)}
            placeholder="-48.0530"
            className="bg-secondary/50 border-border/50 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
