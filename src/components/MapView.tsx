"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Basket } from "@/types";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

type MapViewProps = {
  baskets: Basket[];
  onSelect: (basket: Basket) => void;
  restaurant: { lat: number; lon: number };
};

export default function MapView({ baskets, onSelect, restaurant }: MapViewProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [restaurant.lon, restaurant.lat],
      zoom: 12,
      attributionControl: false
    });

    new mapboxgl.Marker({ color: "#ed4c4c" })
      .setLngLat([restaurant.lon, restaurant.lat])
      .setPopup(
        new mapboxgl.Popup({ className: "heysalad-popup" })
          .setHTML('<div class="popup-content"><strong>Restaurant HQ</strong></div>')
      )
      .addTo(mapRef.current);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [restaurant]);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!mapRef.current) return;

    baskets.forEach((basket) => {
      const marker = new mapboxgl.Marker({
        color:
          basket.status === "delayed"
            ? "#faa09a"
            : basket.status === "delivered"
            ? "#22c55e"
            : "#ed4c4c"
      })
        .setLngLat([basket.lon, basket.lat])
        .setPopup(
          new mapboxgl.Popup({ className: "heysalad-popup" })
            .setHTML(`<div class="popup-content"><strong>Basket ${basket.id}</strong><br/><span class="status-${basket.status}">Status: ${basket.status}</span></div>`)
        )
        .addTo(mapRef.current!);

      marker.getElement().addEventListener("click", () => onSelect(basket));
      markersRef.current.push(marker);
    });
  }, [baskets, onSelect]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-xl shadow-xl" />;
}
