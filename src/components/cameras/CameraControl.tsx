"use client";

import { useState } from "react";
import { Camera, CommandType } from "@/types/camera";
import { useToast } from "@/lib/hooks/useToast";
import {
  Camera as CameraIcon,
  Video,
  StopCircle,
  Activity,
  RotateCw,
  Loader2,
  Battery,
  Signal,
  MapPin,
  Clock,
  Lightbulb,
  Volume2,
  Save,
} from "lucide-react";

interface CameraControlProps {
  camera: Camera;
}

export default function CameraControl({ camera }: CameraControlProps) {
  const [loading, setLoading] = useState<CommandType | null>(null);
  const { success, error } = useToast();

  const sendCommand = async (commandType: CommandType, payload: Record<string, any> = {}) => {
    setLoading(commandType);
    try {
      const response = await fetch(`/api/cameras/${camera.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: commandType,
          payload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send command");
      }

      success(`Command "${commandType}" sent successfully`);
    } catch (err) {
      console.error("Error sending command:", err);
      error(err instanceof Error ? err.message : "Failed to send command");
    } finally {
      setLoading(null);
    }
  };

  const savePhoto = async () => {
    setLoading("save_photo");
    try {
      const response = await fetch(`/api/cameras/${camera.id}/save-photo`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save photo");
      }

      success("Photo saved to database successfully!");
    } catch (err) {
      console.error("Error saving photo:", err);
      error(err instanceof Error ? err.message : "Failed to save photo");
    } finally {
      setLoading(null);
    }
  };

  const commandButtons = [
    {
      type: "take_photo" as CommandType,
      label: "Take Photo",
      icon: CameraIcon,
      color: "brand-cherry",
      payload: { quality: 85, resolution: "1280x720" },
    },
    {
      type: "save_photo" as CommandType,
      label: "Save Frame",
      icon: Save,
      color: "green-500",
      payload: {},
      customHandler: savePhoto,
    },
    {
      type: "toggle_led" as CommandType,
      label: "Night Vision",
      icon: Lightbulb,
      color: "yellow-500",
      payload: {},
    },
    {
      type: "play_sound" as CommandType,
      label: "Play Sound",
      icon: Volume2,
      color: "blue-500",
      payload: { tone: "beep", duration: 500 },
    },
    {
      type: "start_video" as CommandType,
      label: "Start Video",
      icon: Video,
      color: "brand-lime",
      payload: { duration: 30 },
    },
    {
      type: "stop_video" as CommandType,
      label: "Stop Video",
      icon: StopCircle,
      color: "zinc-400",
      payload: {},
    },
    {
      type: "get_status" as CommandType,
      label: "Get Status",
      icon: Activity,
      color: "brand-peach",
      payload: {},
    },
    {
      type: "reboot" as CommandType,
      label: "Reboot",
      icon: RotateCw,
      color: "red-500",
      payload: {},
    },
  ];

  const getStatusColor = (status: Camera["status"]) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-zinc-500";
      case "busy":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-zinc-500";
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

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Camera Controls</h3>
      <div className="grid grid-cols-2 gap-2">
        {commandButtons.map((btn) => {
          const Icon = btn.icon;
          const isLoading = loading === btn.type;
          const isDisabled = camera.status !== "online" || isLoading;

          return (
            <button
              key={btn.type}
              onClick={() => {
                if (!isDisabled) {
                  if ('customHandler' in btn && btn.customHandler) {
                    btn.customHandler();
                  } else {
                    sendCommand(btn.type, btn.payload);
                  }
                }
              }}
              disabled={isDisabled}
              className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                isDisabled
                  ? "cursor-not-allowed border-zinc-800 bg-zinc-900/50 opacity-50"
                  : `border-zinc-700 bg-zinc-900/80 hover:border-${btn.color} hover:bg-${btn.color}/10`
              }`}
              title={btn.label}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-peach" />
              ) : (
                <Icon className={`h-5 w-5 text-${btn.color}`} />
              )}
              <span className="text-sm font-medium text-white">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {camera.status !== "online" && (
        <div className="mt-3 rounded-lg bg-yellow-500/10 p-3 text-center">
          <p className="text-xs text-yellow-500">
            ⚠️ Camera is {camera.status}. Controls are disabled.
          </p>
        </div>
      )}
    </div>
  );
}
