"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from "@react-google-maps/api";

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

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#383838" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1a3a4a" }] },
];

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

// Build a colored circle SVG data URL for POI markers
function makePOIIcon(category: PoiCategory): google.maps.Icon {
  const cfg = POI_CONFIGS[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <circle cx="14" cy="14" r="13" fill="${cfg.color}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
    <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Arial,sans-serif">${cfg.letter}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(28, 28),
    anchor: new window.google.maps.Point(14, 14),
  };
}

function makePropertyIcon(): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38">
    <circle cx="19" cy="19" r="17" fill="#10b981" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
    <text x="19" y="25" text-anchor="middle" font-size="18" font-family="Arial,sans-serif">🏠</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(38, 38),
    anchor: new window.google.maps.Point(19, 19),
  };
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
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    id: "google-map-script",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [showPropertyInfo, setShowPropertyInfo] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<PoiCategory, boolean>>({
    education: true,
    health: true,
    shopping: true,
    leisure: true,
    transport: true,
    food: true,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!latitude || !longitude) {
    return (
      <div className="h-[300px] rounded-xl border border-border/50 bg-card flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Localização não disponível</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-[300px] rounded-xl border border-border/50 bg-card flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[360px] rounded-xl border border-border/50 bg-card flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Carregando mapa...</p>
      </div>
    );
  }

  const isApproximate = address_privacy === "approximate";
  const radiusMeters = (approximate_radius_km ?? 1.0) * 1000;
  const hasPois = pois.length > 0;
  const center = { lat: latitude, lng: longitude };
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
    if (mapRef.current) {
      mapRef.current.panTo({ lat: poi.lat, lng: poi.lng });
      mapRef.current.setZoom(16);
    }
    setSelectedPoi(poi);
  };

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="h-[360px] rounded-xl border border-border/50 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={center}
          zoom={defaultZoom}
          onLoad={onMapLoad}
          options={{
            styles: darkMapStyle,
            scrollwheel: false,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          {/* Property marker or approximate circle */}
          {isApproximate ? (
            <Circle
              center={center}
              radius={radiusMeters}
              options={{
                strokeColor: "#10b981",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#10b981",
                fillOpacity: 0.2,
              }}
            />
          ) : (
            <Marker
              position={center}
              icon={makePropertyIcon()}
              onClick={() => setShowPropertyInfo(true)}
            >
              {showPropertyInfo && (title || address) && (
                <InfoWindow
                  position={center}
                  onCloseClick={() => setShowPropertyInfo(false)}
                >
                  <div style={{ color: "#111", maxWidth: 200 }}>
                    {title && <strong>{title}</strong>}
                    {address && <p style={{ fontSize: 12, marginTop: 4 }}>{address}</p>}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )}

          {/* POI markers */}
          {pois.map((poi, i) => (
            <Marker
              key={`poi-${i}`}
              position={{ lat: poi.lat, lng: poi.lng }}
              icon={makePOIIcon(poi.category)}
              onClick={() => {
                setSelectedPoi(poi);
                setShowPropertyInfo(false);
              }}
            >
              {selectedPoi === poi && (
                <InfoWindow
                  position={{ lat: poi.lat, lng: poi.lng }}
                  onCloseClick={() => setSelectedPoi(null)}
                >
                  <div style={{ color: "#111", maxWidth: 200 }}>
                    <strong>{poi.name}</strong>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      {POI_CONFIGS[poi.category].label} &bull;{" "}
                      {formatDistance(poi.distance_meters)}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
        </GoogleMap>
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
