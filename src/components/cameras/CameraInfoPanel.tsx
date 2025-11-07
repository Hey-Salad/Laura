"use client";

import { Camera } from "@/types/camera";
import { Cpu, Calendar, Tag, HardDrive } from "lucide-react";

interface CameraInfoPanelProps {
  camera: Camera;
}

export default function CameraInfoPanel({ camera }: CameraInfoPanelProps) {
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

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Device Information</h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Cpu className="h-4 w-4 text-brand-peach" />
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Device Type</p>
            <p className="text-sm font-medium text-white">{camera.device_type || "esp32-s3-ai"}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <HardDrive className="h-4 w-4 text-brand-lime" />
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Firmware</p>
            <p className="font-mono text-xs text-white">{camera.firmware_version || "N/A"}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Registered</p>
            <p className="text-xs text-white">{formatDate(camera.created_at)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Tag className="h-4 w-4 text-zinc-400" />
          <div className="flex-1">
            <p className="text-xs text-zinc-500">UUID</p>
            <p className="break-all font-mono text-[10px] text-zinc-400">{camera.id}</p>
          </div>
        </div>

        {camera.metadata && Object.keys(camera.metadata).length > 0 && (
          <div className="mt-4 rounded-lg bg-zinc-900/50 p-3">
            <p className="mb-2 text-xs font-medium text-zinc-400">Metadata</p>
            <pre className="overflow-x-auto text-[10px] text-zinc-500">
              {JSON.stringify(camera.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
