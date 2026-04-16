"use client";

import { useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

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

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { lat: number | null; lng: number | null }) => void;
}

export default function MapPicker({
  latitude,
  longitude,
  onChange,
}: MapPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    id: "google-map-script",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [lat, setLat] = useState<string>(latitude?.toString() || "");
  const [lng, setLng] = useState<string>(longitude?.toString() || "");

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newLat = Math.round(e.latLng.lat() * 10000) / 10000;
      const newLng = Math.round(e.latLng.lng() * 10000) / 10000;
      setLat(newLat.toString());
      setLng(newLng.toString());
      onChange({ lat: newLat, lng: newLng });
    },
    [onChange]
  );

  const handleMarkerDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newLat = Math.round(e.latLng.lat() * 10000) / 10000;
      const newLng = Math.round(e.latLng.lng() * 10000) / 10000;
      setLat(newLat.toString());
      setLng(newLng.toString());
      onChange({ lat: newLat, lng: newLng });
    },
    [onChange]
  );

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
    if (validLat !== null && validLng !== null && mapRef.current) {
      mapRef.current.panTo({ lat: validLat, lng: validLng });
    }
  };

  const center = {
    lat: latitude || -23.5,
    lng: longitude || -48.0,
  };

  const defaultZoom = latitude && longitude ? 15 : 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <span>Clique no mapa para marcar a localizacao do imovel</span>
      </div>

      <div className="h-64 rounded-xl border border-border/50 overflow-hidden">
        {loadError ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Erro ao carregar o mapa</p>
          </div>
        ) : !isLoaded ? (
          <div className="h-full flex items-center justify-center text-muted-foreground bg-card">
            <p className="text-sm">Carregando mapa...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ height: "100%", width: "100%" }}
            center={center}
            zoom={defaultZoom}
            onLoad={onMapLoad}
            onClick={handleMapClick}
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
            {latitude && longitude && (
              <Marker
                position={{ lat: latitude, lng: longitude }}
                draggable
                onDragEnd={handleMarkerDrag}
              />
            )}
          </GoogleMap>
        )}
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
