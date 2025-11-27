"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
  onLocationSelect?: (lat: number, lng: number) => void;
  className?: string;
}

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapComponent({
  center,
  zoom = 13,
  markers = [],
  onLocationSelect,
  className = "h-96 w-full",
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

    // Add OpenStreetMap tiles
    L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILES_URL ||
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      },
    ).addTo(mapRef.current);

    // Add click handler for location selection
    if (onLocationSelect) {
      mapRef.current.on("click", (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });
    }

    // Add markers
    markers.forEach((marker) => {
      const leafletMarker = L.marker([
        marker.position[0],
        marker.position[1],
      ]).addTo(mapRef.current!).bindPopup(`
          <div>
            <h3>${marker.title}</h3>
            ${marker.description ? `<p>${marker.description}</p>` : ""}
          </div>
        `);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, markers, onLocationSelect]);

  return <div ref={mapContainerRef} className={className} />;
}
