
"use client";

import type { Device } from "@/types";
import { Battery, Signal, MapPin, Activity } from "lucide-react";

type DeviceTableProps = {
  devices: Device[];
};

export const DeviceTable = ({ devices }: DeviceTableProps) => {
  if (!devices.length) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-8 text-center text-zinc-400 backdrop-blur">
        <Activity className="mx-auto h-12 w-12 mb-4 text-zinc-600" />
        <p className="text-lg font-medium text-white mb-2">No devices found</p>
        <p className="text-sm">
          Provision your first Meshtastic device to start tracking baskets.
        </p>
      </div>
    );
  }

  const getStatusColor = (status: Device["status"]) => {
    switch (status) {
      case "active":
        return "text-emerald-400 bg-emerald-400/10";
      case "inactive":
        return "text-zinc-400 bg-zinc-400/10";
      case "provisioning":
        return "text-yellow-400 bg-yellow-400/10";
      case "maintenance":
        return "text-orange-400 bg-orange-400/10";
      case "decommissioned":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-zinc-400 bg-zinc-400/10";
    }
  };

  const getBatteryColor = (level: number | null | undefined) => {
    if (!level) return "text-zinc-500";
    if (level > 60) return "text-emerald-400";
    if (level > 20) return "text-yellow-400";
    return "text-red-400";
  };

  const getSignalColor = (strength: number | null | undefined) => {
    if (!strength) return "text-zinc-500";
    if (strength > -70) return "text-emerald-400";
    if (strength > -90) return "text-yellow-400";
    return "text-red-400";
  };

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return "Never";
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <div
          key={device.id}
          className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-6 backdrop-blur transition-all hover:border-brand-cherry/30"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{device.device_name}</h3>
              <p className="text-sm text-zinc-400 font-mono">{device.device_id}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
              {device.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Battery className={`h-4 w-4 ${getBatteryColor(device.battery_level)}`} />
              <div>
                <p className="text-xs text-zinc-500">Battery</p>
                <p className="text-sm font-medium text-white">
                  {device.battery_level ? `${device.battery_level}%` : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Signal className={`h-4 w-4 ${getSignalColor(device.signal_strength)}`} />
              <div>
                <p className="text-xs text-zinc-500">Signal</p>
                <p className="text-sm font-medium text-white">
                  {device.signal_strength ? `${device.signal_strength} dBm` : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-peach" />
              <div>
                <p className="text-xs text-zinc-500">Location</p>
                <p className="text-sm font-medium text-white">
                  {device.location_lat && device.location_lon 
                    ? `${device.location_lat.toFixed(4)}, ${device.location_lon.toFixed(4)}`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Last Seen</p>
                <p className="text-sm font-medium text-white">
                  {formatLastSeen(device.last_seen)}
                </p>
              </div>
            </div>
          </div>

          {device.hardware_model && (
            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Model: <span className="text-zinc-300">{device.hardware_model}</span></span>
                {device.firmware_version && (
                  <span>Firmware: <span className="text-zinc-300">{device.firmware_version}</span></span>
                )}
                {device.basket_id && (
                  <span>Basket: <span className="text-brand-peach">{device.basket_id.slice(0, 8)}</span></span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
