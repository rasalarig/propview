"use client";

import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet icon broken in bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type PoiCategory =
  | "education"
  | "health"
  | "shopping"
  | "leisure"
  | "transport"
  | "food";

export interface POI {
  category: PoiCategory;
  name: string;
  lat: number;
  lng: number;
  distance_meters: number;
}

interface POI_CONFIG {
  color: string;
  letter: string;
  label: string;
}

const POI_CONFIGS: Record<PoiCategory, POI_CONFIG> = {
  education: { color: "#3b82f6", letter: "E", label: "Educação" },
  health:    { color: "#ef4444", letter: "S", label: "Saúde" },
  shopping:  { color: "#f97316", letter: "C", label: "Compras" },
  leisure:   { color: "#22c55e", letter: "L", label: "Lazer" },
  transport: { color: "#8b5cf6", letter: "T", label: "Transporte" },
  food:      { color: "#eab308", letter: "A", label: "Alimentação" },
};

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

function makeDivIcon(color: string, letter: string, size = 28): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid rgba(255,255,255,0.85);
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.43}px;font-weight:700;color:#fff;
      font-family:Arial,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,0.5);
    ">${letter}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

const propertyIcon = makeDivIcon("#10b981", "🏠", 36);

function makePOIIcon(category: PoiCategory): L.DivIcon {
  const cfg = POI_CONFIGS[category];
  return makeDivIcon(cfg.color, cfg.letter, 28);
}

// Sub-component that can call useMap() to fly to a POI
interface FlyControllerProps {
  target: { lat: number; lng: number; zoom: number } | null;
}
function FlyController({ target }: FlyControllerProps) {
  const map = useMap();
  if (target) {
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
  }
  return null;
}

interface PropertyMapProps {
  latitude: number | null;
  longitude: number | null;
  title?: string;
  address?: string;
  address_privacy?: "exact" | "approximate";
  approximate_radius_km?: number | null;
  pois?: POI[];
}

export default function PropertyMap({
  latitude,
  longitude,
  title,
  address,
  address_privacy = "exact",
  approximate_radius_km = 1.0,
  pois = [],
}: PropertyMapProps) {
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<PoiCategory, boolean>>({
    education: true,
    health: true,
    shopping: true,
    leisure: true,
    transport: true,
    food: true,
  });

  if (!latitude || !longitude) {
    return (
      <div className="h-[300px] rounded-xl border border-border/50 bg-card flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Localização não disponível</p>
      </div>
    );
  }

  const isApproximate = address_privacy === "approximate";
  const radiusMeters = (approximate_radius_km ?? 1.0) * 1000;
  const hasPois = pois.length > 0;
  const center: [number, number] = [latitude, longitude];
  const defaultZoom = hasPois ? 14 : isApproximate ? 13 : 15;

  // Group POIs by category
  const poisByCategory: Partial<Record<PoiCategory, POI[]>> = {};
  for (const poi of pois) {
    if (!poisByCategory[poi.category]) poisByCategory[poi.category] = [];
    poisByCategory[poi.category]!.push(poi);
  }

  const toggleCategory = (cat: PoiCategory) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const flyToPoi = (poi: POI) => {
    setFlyTarget({ lat: poi.lat, lng: poi.lng, zoom: 16 });
  };

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className={`${hasPois ? "h-[360px]" : "h-[300px]"} rounded-xl border border-border/50 overflow-hidden`}>
        <MapContainer
          center={center}
          zoom={defaultZoom}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <FlyController target={flyTarget} />

          {/* Property marker or approximate circle */}
          {isApproximate ? (
            <Circle
              center={center}
              radius={radiusMeters}
              pathOptions={{
                color: "#10b981",
                weight: 2,
                opacity: 0.8,
                fillColor: "#10b981",
                fillOpacity: 0.2,
              }}
            />
          ) : (
            <Marker position={center} icon={propertyIcon}>
              {(title || address) && (
                <Popup>
                  <div style={{ maxWidth: 200 }}>
                    {title && <strong>{title}</strong>}
                    {address && <p style={{ fontSize: 12, marginTop: 4 }}>{address}</p>}
                  </div>
                </Popup>
              )}
            </Marker>
          )}

          {/* POI markers */}
          {pois.map((poi, i) => (
            <Marker
              key={`poi-${i}`}
              position={[poi.lat, poi.lng]}
              icon={makePOIIcon(poi.category)}
            >
              <Popup>
                <div style={{ maxWidth: 200 }}>
                  <strong>{poi.name}</strong>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    {POI_CONFIGS[poi.category].label} &bull;{" "}
                    {formatDistance(poi.distance_meters)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend (only when there are POIs) */}
      {hasPois && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {(Object.keys(POI_CONFIGS) as PoiCategory[]).map((cat) =>
            poisByCategory[cat] ? (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4 h-4 rounded-full shrink-0"
                  style={{ background: POI_CONFIGS[cat].color }}
                />
                <span className="text-xs text-muted-foreground">
                  {POI_CONFIGS[cat].label}
                </span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* POI list grouped by category */}
      {hasPois && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">
              Pontos de interesse próximos
            </h3>
          </div>
          <div className="divide-y divide-border/30">
            {(Object.keys(POI_CONFIGS) as PoiCategory[]).map((cat) => {
              const items = poisByCategory[cat];
              if (!items || items.length === 0) return null;
              const cfg = POI_CONFIGS[cat];
              const isOpen = openCategories[cat];
              return (
                <div key={cat}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex w-6 h-6 rounded-full items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: cfg.color }}
                      >
                        {cfg.letter}
                      </span>
                      <span className="text-sm font-medium">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({items.length})
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* POI items */}
                  {isOpen && (
                    <ul className="pb-1">
                      {items.map((poi, i) => (
                        <li key={i}>
                          <button
                            onClick={() => flyToPoi(poi)}
                            className="w-full flex items-center justify-between px-4 py-2 hover:bg-secondary/20 transition-colors text-left"
                          >
                            <span className="text-sm text-foreground truncate pr-3">
                              {poi.name}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatDistance(poi.distance_meters)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
