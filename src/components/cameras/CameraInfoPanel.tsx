"use client";

import { Camera } from "@/types/camera";
import {
  Battery,
  Signal,
  MapPin,
  Clock,
  Cpu,
  HardDrive,
  Calendar,
  Tag,
  MapPinned,
  Wifi,
  Zap,
} from "lucide-react";

interface CameraInfoPanelProps {
  camera: Camera;
}

export default function CameraInfoPanel({ camera }: CameraInfoPanelProps) {
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

  const getStatusBadgeColor = (status: Camera["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "offline":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      case "busy":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
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

  const getSignalStrength = (rssi?: number): string => {
    if (!rssi) return "Unknown";
    if (rssi > -60) return "Excellent";
    if (rssi > -75) return "Good";
    return "Fair";
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp?: string) => {
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

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur">
      {/* Header Section */}
      <div className="border-b border-zinc-800/50 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(camera.status)} animate-pulse`} />
              <h2 className="text-2xl font-bold text-white">{camera.camera_name}</h2>
            </div>
            <p className="mt-2 font-mono text-sm text-brand-peach">{camera.camera_id}</p>
            {camera.assigned_to && (
              <div className="mt-3 flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-brand-lime" />
                <p className="text-sm text-zinc-300">{camera.assigned_to}</p>
              </div>
            )}
          </div>
          <div className={`rounded-lg border px-4 py-2 ${getStatusBadgeColor(camera.status)}`}>
            <span className="text-sm font-semibold uppercase tracking-wide">
              {camera.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 divide-y divide-zinc-800/50 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Battery Level */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-lg bg-zinc-900/50 p-3 ${getBatteryColor(camera.battery_level)}`}>
              <Battery className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Battery Level</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {camera.battery_level !== undefined ? `${camera.battery_level}%` : "N/A"}
              </p>
              {camera.battery_level !== undefined && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full ${
                      camera.battery_level > 60
                        ? "bg-green-500"
                        : camera.battery_level > 30
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${camera.battery_level}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WiFi Signal */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-lg bg-zinc-900/50 p-3 ${getSignalColor(camera.wifi_signal)}`}>
              <Signal className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">WiFi Signal</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {camera.wifi_signal !== undefined ? `${camera.wifi_signal} dBm` : "N/A"}
              </p>
              {camera.wifi_signal !== undefined && (
                <p className="mt-1 text-sm text-zinc-400">{getSignalStrength(camera.wifi_signal)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Info Section */}
      <div className="border-t border-zinc-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Device Information
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Device Type */}
          <div className="flex items-start gap-3">
            <Cpu className="h-5 w-5 text-brand-peach" />
            <div>
              <p className="text-xs text-zinc-400">Device Type</p>
              <p className="mt-0.5 font-medium text-white">{camera.device_type || "Unknown"}</p>
            </div>
          </div>

          {/* Firmware Version */}
          <div className="flex items-start gap-3">
            <HardDrive className="h-5 w-5 text-brand-lime" />
            <div>
              <p className="text-xs text-zinc-400">Firmware Version</p>
              <p className="mt-0.5 font-mono text-sm font-medium text-white">
                {camera.firmware_version || "N/A"}
              </p>
            </div>
          </div>

          {/* Location */}
          {camera.location_lat && camera.location_lon && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand-cherry" />
              <div>
                <p className="text-xs text-zinc-400">GPS Coordinates</p>
                <p className="mt-0.5 font-mono text-sm font-medium text-white">
                  {camera.location_lat.toFixed(4)}, {camera.location_lon.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          {/* Last Seen */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-400">Last Seen</p>
              <p className="mt-0.5 font-medium text-white">{formatRelativeTime(camera.last_seen)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{formatDate(camera.last_seen)}</p>
            </div>
          </div>

          {/* Created At */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-400">Registered</p>
              <p className="mt-0.5 text-sm text-zinc-300">{formatDate(camera.created_at)}</p>
            </div>
          </div>

          {/* Updated At */}
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-zinc-300">{formatDate(camera.updated_at)}</p>
            </div>
          </div>

          {/* Camera ID (UUID) */}
          <div className="flex items-start gap-3 sm:col-span-2">
            <Tag className="h-5 w-5 text-zinc-400" />
            <div className="flex-1">
              <p className="text-xs text-zinc-400">Camera UUID</p>
              <p className="mt-0.5 break-all font-mono text-xs text-zinc-300">{camera.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Section (if available) */}
      {camera.metadata && Object.keys(camera.metadata).length > 0 && (
        <div className="border-t border-zinc-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Additional Metadata
          </h3>
          <div className="rounded-lg bg-zinc-900/50 p-4">
            <pre className="overflow-x-auto text-xs text-zinc-300">
              {JSON.stringify(camera.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
