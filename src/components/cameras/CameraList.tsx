"use client";

import { Camera } from "@/types/camera";
import { Battery, Signal, MapPin, Clock } from "lucide-react";

interface CameraListProps {
  cameras: Camera[];
  selectedCameraId?: string;
  onSelectCamera: (cameraId: string) => void;
}

export default function CameraList({
  cameras,
  selectedCameraId,
  onSelectCamera,
}: CameraListProps) {
  const getStatusColor = (status: Camera["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-zinc-500";
      case "busy":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-zinc-500";
    }
  };

  const getStatusText = (status: Camera["status"]) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return "text-zinc-500";
    if (level > 60) return "text-green-500";
    if (level > 30) return "text-yellow-500";
    return "text-red-500";
  };

  const getSignalColor = (rssi?: number) => {
    if (!rssi) return "text-zinc-500";
    if (rssi > -60) return "text-green-500";
    if (rssi > -75) return "text-yellow-500";
    return "text-red-500";
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (cameras.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-8 text-center backdrop-blur">
        <p className="text-sm text-zinc-400">No cameras registered yet.</p>
        <p className="mt-2 text-xs text-zinc-500">
          Register your ESP32-S3 cameras to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cameras.map((camera) => (
        <article
          key={camera.id}
          onClick={() => onSelectCamera(camera.id)}
          className={`cursor-pointer rounded-xl border p-4 backdrop-blur transition-all hover:border-brand-cherry/50 ${
            selectedCameraId === camera.id
              ? "border-brand-cherry bg-brand-cherry/10"
              : "border-zinc-800/50 bg-zinc-950/80"
          }`}
        >
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white">{camera.camera_name}</h3>
              <p className="text-xs font-mono text-brand-peach">{camera.camera_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(camera.status)}`} />
              <span className="text-xs text-zinc-400">{getStatusText(camera.status)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {/* Battery */}
            {camera.battery_level !== undefined && (
              <div className="flex items-center gap-1.5">
                <Battery className={`h-4 w-4 ${getBatteryColor(camera.battery_level)}`} />
                <span className="text-xs text-zinc-300">{camera.battery_level}%</span>
              </div>
            )}

            {/* WiFi Signal */}
            {camera.wifi_signal !== undefined && (
              <div className="flex items-center gap-1.5">
                <Signal className={`h-4 w-4 ${getSignalColor(camera.wifi_signal)}`} />
                <span className="text-xs text-zinc-300">{camera.wifi_signal} dBm</span>
              </div>
            )}

            {/* Location */}
            {camera.location_lat && camera.location_lon && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-lime" />
                <span className="text-xs text-zinc-300">
                  {camera.location_lat.toFixed(2)}, {camera.location_lon.toFixed(2)}
                </span>
              </div>
            )}

            {/* Last Seen */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="text-xs text-zinc-400">{formatLastSeen(camera.last_seen)}</span>
            </div>
          </div>

          {/* Assigned To */}
          {camera.assigned_to && (
            <div className="mt-3 rounded-lg bg-zinc-900/50 px-2 py-1">
              <p className="text-xs text-zinc-400">
                Assigned: <span className="text-white">{camera.assigned_to}</span>
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
