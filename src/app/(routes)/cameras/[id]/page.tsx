"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Camera {
  id: string;
  camera_id: string;
  camera_name: string;
  device_type: string;
  status: string;
  metadata: any;
}

interface Command {
  id: string;
  command_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  response: any;
}

export default function CameraDetailPage() {
  const params = useParams();
  const cameraId = params.id as string;

  const [camera, setCamera] = useState<Camera | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCamera();
    fetchCommands();
    const interval = setInterval(fetchCommands, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [cameraId]);

  const fetchCamera = async () => {
    try {
      const res = await fetch(`/api/cameras?id=${cameraId}`);
      const data = await res.json();
      if (data.cameras && data.cameras.length > 0) {
        setCamera(data.cameras[0]);
      }
    } catch (error) {
      console.error("Error fetching camera:", error);
    }
  };

  const fetchCommands = async () => {
    try {
      const res = await fetch(`/api/cameras/${cameraId}/command-history?limit=20`);
      const data = await res.json();
      if (data.commands) {
        setCommands(data.commands);
      }
    } catch (error) {
      console.error("Error fetching commands:", error);
    }
  };

  const sendCommand = async (command_type: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cameras/${cameraId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command_type, payload }),
      });

      if (res.ok) {
        setTimeout(fetchCommands, 500); // Refresh commands after a moment
      }
    } catch (error) {
      console.error("Error sending command:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "in_progress":
        return "bg-yellow-500";
      default:
        return "bg-zinc-500";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#ed4c4c]">
              {camera?.camera_name || "Loading..."}
            </h1>
            <p className="text-zinc-400 mt-1">{camera?.device_type}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                camera?.status === "online"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {camera?.status === "online" ? "● Online" : "○ Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stream & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Stream */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📹 Live Stream</h2>
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800">
              <img
                src={`/api/cameras/${cameraId}/stream`}
                alt="Camera Stream"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='800' height='450' fill='%23000'/%3E%3Ctext x='400' y='225' font-family='sans-serif' font-size='20' fill='%23666' text-anchor='middle'%3ENo Stream Available%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => sendCommand("take_photo", {})}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                📸 Take Photo
              </button>
              <button
                onClick={() => sendCommand("save_photo", {})}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                💾 Save Frame
              </button>
            </div>
          </div>

          {/* Gimbal Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">🎮 Gimbal Control</h2>

            {/* Quick Presets */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                Quick Presets
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "⬤ Center", value: "center" },
                  { label: "← Left", value: "left" },
                  { label: "→ Right", value: "right" },
                  { label: "↑ Up", value: "up" },
                  { label: "↓ Down", value: "down" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() =>
                      sendCommand("gimbal_preset", { preset: preset.value })
                    }
                    disabled={loading}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-semibold text-sm disabled:opacity-50 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Control */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                Manual Control
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-300 mb-2 block">
                    Yaw: {yaw}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={yaw}
                    onChange={(e) => setYaw(Number(e.target.value))}
                    className="w-full accent-[#ed4c4c]"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 mb-2 block">
                    Pitch: {pitch}°
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full accent-[#ed4c4c]"
                  />
                </div>
                <button
                  onClick={() =>
                    sendCommand("gimbal_set_angle", {
                      yaw_angle: yaw,
                      pitch_angle: pitch,
                    })
                  }
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#ed4c4c] hover:bg-[#d43939] rounded-lg font-semibold disabled:opacity-50 transition"
                >
                  🎯 Move to Position
                </button>
              </div>
            </div>

            {/* Emergency Stop */}
            <button
              onClick={() => {
                if (
                  confirm("Are you sure you want to emergency stop the gimbal?")
                ) {
                  sendCommand("gimbal_stop", {});
                }
              }}
              disabled={loading}
              className="w-full mt-4 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold disabled:opacity-50 transition"
            >
              🛑 EMERGENCY STOP
            </button>
          </div>
        </div>

        {/* Right Column: Command History */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📋 Command History</h2>
            <div className="space-y-2 max-h-[800px] overflow-y-auto">
              {commands.length === 0 ? (
                <p className="text-zinc-500 text-sm">No commands yet</p>
              ) : (
                commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">
                        {cmd.command_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                          cmd.status
                        )}`}
                      >
                        {cmd.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {new Date(cmd.created_at).toLocaleString()}
                    </p>
                    {cmd.response && Object.keys(cmd.response).length > 0 && (
                      <pre className="text-xs text-zinc-500 mt-2 bg-zinc-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(cmd.response, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Camera Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">ℹ️ Camera Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Camera ID:</span>
                <span className="font-mono">{camera?.camera_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Device Type:</span>
                <span>{camera?.device_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span
                  className={
                    camera?.status === "online"
                      ? "text-green-400"
                      : "text-zinc-500"
                  }
                >
                  {camera?.status}
                </span>
              </div>
              {camera?.metadata?.rtsp_url && (
                <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">RTSP URL:</p>
                  <code className="text-xs text-[#ed4c4c] break-all">
                    {camera.metadata.rtsp_url}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
