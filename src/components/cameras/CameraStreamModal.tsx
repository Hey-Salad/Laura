"use client";

import { useState, useEffect, useRef } from "react";
import { Camera } from "@/types/camera";
import { X, RefreshCw, AlertCircle, Video, MapPin, Clock } from "lucide-react";

interface CameraStreamModalProps {
  camera: Camera;
  isOpen: boolean;
  onClose: () => void;
}

type StreamMode = "live" | "snapshot";

export default function CameraStreamModal({ camera, isOpen, onClose }: CameraStreamModalProps) {
  const [streamMode, setStreamMode] = useState<StreamMode>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const imgRef = useRef<HTMLImageElement>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get stream URL
  const getStreamUrl = (): string => {
    return `/api/cameras/${camera.id}/stream`;
  };

  // Get snapshot URL
  const getSnapshotUrl = (): string => {
    return `/api/cameras/${camera.id}/snapshot?t=${Date.now()}`;
  };

  const streamUrl = getStreamUrl();

  // Auto-refresh snapshot mode
  useEffect(() => {
    if (streamMode === "snapshot" && camera.status === "online") {
      const interval = setInterval(() => {
        setSnapshotUrl(getSnapshotUrl());
        setLastRefresh(new Date());
      }, 3000); // Refresh every 3 seconds

      return () => clearInterval(interval);
    }
  }, [streamMode, camera.status, camera.id]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    if (streamMode === "live" && snapshotUrl === null) {
      setStreamMode("snapshot");
      setSnapshotUrl(getSnapshotUrl());
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    setSnapshotUrl(getSnapshotUrl());
    setLastRefresh(new Date());
  };

  useEffect(() => {
    if (streamMode === "snapshot") {
      setSnapshotUrl(getSnapshotUrl());
    }
  }, [streamMode]);

  // Calculate connection freshness
  const getConnectionStatus = () => {
    if (!camera.last_seen) return { text: "Unknown", color: "text-zinc-500" };

    const lastSeenDate = new Date(camera.last_seen);
    const diffMs = currentTime.getTime() - lastSeenDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return { text: "Live (now)", color: "text-green-500" };
    if (diffSeconds < 30) return { text: `Live (${diffSeconds}s ago)`, color: "text-green-500" };
    if (diffSeconds < 60) return { text: `${diffSeconds}s ago`, color: "text-yellow-500" };
    if (diffSeconds < 300) return { text: `${Math.floor(diffSeconds / 60)}m ago`, color: "text-yellow-500" };
    return { text: "Connection issue", color: "text-red-500" };
  };

  const connectionStatus = getConnectionStatus();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-black border border-zinc-800 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Black with white text */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-brand-cherry" />
            <div>
              <h2 className="text-lg font-semibold text-white">{camera.camera_name}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-mono">{camera.camera_id}</span>
                {camera.assigned_to && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{camera.assigned_to}</span>
                    </div>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className={connectionStatus.color}>{connectionStatus.text}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
              <button
                onClick={() => setStreamMode("live")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  streamMode === "live"
                    ? "bg-brand-cherry text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Live
              </button>
              <button
                onClick={() => {
                  setStreamMode("snapshot");
                  setSnapshotUrl(getSnapshotUrl());
                }}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  streamMode === "snapshot"
                    ? "bg-brand-cherry text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Snapshot
              </button>
            </div>

            {streamMode === "snapshot" && (
              <button
                onClick={handleManualRefresh}
                className="rounded-lg bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Refresh snapshot"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stream/Preview Area */}
        <div className="relative aspect-video bg-black">
          {camera.status !== "online" ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-zinc-700" />
                <p className="mt-4 text-base text-white">Camera is {camera.status}</p>
                <p className="mt-2 text-sm text-zinc-500">Live preview unavailable</p>
              </div>
            </div>
          ) : hasError ? (
            <div className="flex h-full items-center justify-center px-8">
              <div className="max-w-md text-center">
                <Video className="mx-auto h-16 w-16 text-zinc-700" />
                <p className="mt-4 text-lg font-semibold text-white">No Stream Available</p>
                <p className="mt-2 text-sm text-zinc-400">
                  The camera hasn't started streaming yet
                </p>
                <div className="mt-6 rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-left text-xs text-zinc-400">
                  <p className="mb-3 font-semibold text-zinc-300">To start streaming:</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Close this dialog and scroll down to Camera Controls</li>
                    <li>Click the <span className="text-brand-lime font-semibold">"Start Video"</span> button</li>
                    <li>Wait 2-3 seconds for frames to start arriving</li>
                    <li>The stream preview will automatically update</li>
                  </ol>
                  <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">
                    <p>💡 Tip: Frames are uploaded every 2 seconds when streaming is enabled</p>
                  </div>
                </div>
                <button
                  onClick={handleManualRefresh}
                  className="mt-6 rounded-lg bg-brand-cherry px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-cherry/80"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-cherry border-t-transparent" />
                    <p className="mt-4 text-base text-white">Loading stream...</p>
                  </div>
                </div>
              )}
              <img
                ref={imgRef}
                src={streamMode === "live" && streamUrl ? streamUrl : snapshotUrl || ""}
                alt="Camera stream"
                className="h-full w-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          )}
        </div>

        {/* Footer Info - Black with white text */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {streamMode === "live" ? (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="font-medium text-white">LIVE STREAM</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">MJPEG</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-zinc-500" />
                  <span className="text-white">Auto-refresh every 3s</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">Last: {lastRefresh.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-400">
              {camera.battery_level !== undefined && (
                <span>🔋 {camera.battery_level}%</span>
              )}
              {camera.wifi_signal !== undefined && (
                <span>📶 {camera.wifi_signal} dBm</span>
              )}
              {camera.location_lat && camera.location_lon && (
                <span>📍 {camera.location_lat.toFixed(4)}, {camera.location_lon.toFixed(4)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
