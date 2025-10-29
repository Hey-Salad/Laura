"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Camera } from "@/types/camera";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

type CameraMapViewProps = {
  cameras: Camera[];
  onSelect: (camera: Camera) => void;
  selectedCameraId?: string;
};

export default function CameraMapView({ cameras, onSelect, selectedCameraId }: CameraMapViewProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Find center point - use first camera with location or default to Berlin
    const firstCameraWithLocation = cameras.find(c => c.location_lat && c.location_lon);
    const centerLat = firstCameraWithLocation?.location_lat ?? 52.5219;
    const centerLon = firstCameraWithLocation?.location_lon ?? 13.4132;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [centerLon, centerLat],
      zoom: 12,
      attributionControl: false
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update camera markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove markers for cameras that no longer exist or don't have location
    markersRef.current.forEach((marker, cameraId) => {
      const camera = cameras.find(c => c.id === cameraId);
      if (!camera || !camera.location_lat || !camera.location_lon) {
        marker.remove();
        markersRef.current.delete(cameraId);
      }
    });

    // Add or update markers for cameras with location
    cameras.forEach((camera) => {
      if (!camera.location_lat || !camera.location_lon) return;

      const existingMarker = markersRef.current.get(camera.id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat([camera.location_lon, camera.location_lat]);

        // Update marker color based on status
        const color = getStatusColor(camera.status);
        const markerElement = existingMarker.getElement();
        const svg = markerElement.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', color);
        }

        // Update popup
        const popup = existingMarker.getPopup();
        if (popup) {
          popup.setHTML(getPopupHTML(camera));
        }
      } else {
        // Create new marker
        const color = getStatusColor(camera.status);
        const marker = new mapboxgl.Marker({
          color,
          scale: selectedCameraId === camera.id ? 1.2 : 1
        })
          .setLngLat([camera.location_lon, camera.location_lat])
          .setPopup(
            new mapboxgl.Popup({ className: "heysalad-popup" })
              .setHTML(getPopupHTML(camera))
          )
          .addTo(mapRef.current!);

        marker.getElement().addEventListener("click", () => onSelect(camera));
        markersRef.current.set(camera.id, marker);
      }
    });

    // Fit bounds to show all cameras
    if (cameras.length > 0) {
      const camerasWithLocation = cameras.filter(c => c.location_lat && c.location_lon);
      if (camerasWithLocation.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        camerasWithLocation.forEach(camera => {
          bounds.extend([camera.location_lon!, camera.location_lat!]);
        });
        mapRef.current?.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  }, [cameras, onSelect]);

  // Update selected camera marker scale
  useEffect(() => {
    markersRef.current.forEach((marker, cameraId) => {
      const scale = selectedCameraId === cameraId ? 1.2 : 1;
      const element = marker.getElement();
      element.style.transform = `scale(${scale})`;
    });
  }, [selectedCameraId]);

  return <div ref={containerRef} className="h-[60vh] w-full rounded-xl shadow-xl" />;
}

function getStatusColor(status: Camera["status"]): string {
  switch (status) {
    case "online":
      return "#22c55e"; // green
    case "offline":
      return "#71717a"; // zinc
    case "busy":
      return "#eab308"; // yellow
    case "error":
      return "#ef4444"; // red
    default:
      return "#71717a"; // zinc
  }
}

function getPopupHTML(camera: Camera): string {
  const statusEmoji = camera.status === "online" ? "🟢" :
                      camera.status === "busy" ? "🟡" :
                      camera.status === "error" ? "🔴" : "⚫";

  return `
    <div class="popup-content">
      <strong>${camera.camera_name}</strong><br/>
      <span class="font-mono text-xs">${camera.camera_id}</span><br/>
      <span class="status-${camera.status}">${statusEmoji} ${camera.status.toUpperCase()}</span><br/>
      ${camera.assigned_to ? `<span class="text-xs">📍 ${camera.assigned_to}</span>` : ''}
      ${camera.battery_level !== undefined ? `<br/><span class="text-xs">🔋 ${camera.battery_level}%</span>` : ''}
      ${camera.wifi_signal !== undefined ? `<span class="text-xs ml-2">📶 ${camera.wifi_signal} dBm</span>` : ''}
    </div>
  `;
}
