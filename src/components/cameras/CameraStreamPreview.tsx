"use client";

import { useState, useEffect, useRef } from "react";
import { Camera } from "@/types/camera";
import { Video, RefreshCw, AlertCircle, Maximize2, MapPin, Clock } from "lucide-react";
import CameraStreamModal from "./CameraStreamModal";

interface CameraStreamPreviewProps {
  camera: Camera;
}

type StreamMode = "live" | "snapshot";

export default function CameraStreamPreview({ camera }: CameraStreamPreviewProps) {
  const [streamMode, setStreamMode] = useState<StreamMode>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get stream URL - always use Laura API endpoint
  const getStreamUrl = (): string => {
    return `/api/cameras/${camera.id}/stream`;
  };

  // Get snapshot URL - always use Laura API endpoint
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
      // Fallback to snapshot mode if live stream fails
      setStreamMode("snapshot");
      setSnapshotUrl(getSnapshotUrl());
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    setSnapshotUrl(getSnapshotUrl());
    setLastRefresh(new Date());
  };

  const handleFullscreen = () => {
    setIsModalOpen(true);
  };

  useEffect(() => {
    // Initialize snapshot URL for snapshot mode
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

    if (diffSeconds < 10) return { text: "Live", color: "text-green-500" };
    if (diffSeconds < 30) return { text: `${diffSeconds}s`, color: "text-green-500" };
    if (diffSeconds < 60) return { text: `${diffSeconds}s`, color: "text-yellow-500" };
    if (diffSeconds < 300) return { text: `${Math.floor(diffSeconds / 60)}m`, color: "text-yellow-500" };
    return { text: "Offline", color: "text-red-500" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur">
        {/* Header with camera info */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-brand-cherry" />
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold text-white">{camera.camera_name}</h3>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                {camera.assigned_to && (
                  <>
                    <div className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{camera.assigned_to}</span>
                    </div>
                    <span>•</span>
                  </>
                )}
                <div className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  <span className={connectionStatus.color}>{connectionStatus.text}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Mode Selector */}
            <div className="flex gap-0.5 rounded bg-zinc-900 p-0.5">
              <button
                onClick={() => setStreamMode("live")}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
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
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  streamMode === "snapshot"
                    ? "bg-brand-cherry text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Snap
              </button>
            </div>

            {streamMode === "snapshot" && (
              <button
                onClick={handleManualRefresh}
                className="rounded bg-zinc-900 p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Refresh snapshot"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}

            <button
              onClick={handleFullscreen}
              className="rounded bg-zinc-900 p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              title="Fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Stream/Preview Area */}
        <div className="relative flex-1 bg-zinc-900" onClick={handleFullscreen}>
          {camera.status !== "online" ? (
            <div className="flex h-full cursor-pointer items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-2 text-xs text-zinc-400">Camera {camera.status}</p>
              </div>
            </div>
          ) : hasError ? (
            <div className="flex h-full cursor-pointer items-center justify-center px-4">
              <div className="max-w-xs text-center">
                <Video className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-2 text-xs font-semibold text-white">No Stream Available</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  The camera hasn't started streaming yet
                </p>
                <div className="mt-3 rounded bg-zinc-800 p-2 text-[9px] text-zinc-400">
                  <p className="mb-1 font-semibold text-zinc-300">To start streaming:</p>
                  <p>1. Click "Start Video" button below</p>
                  <p>2. Wait a few seconds for frames to arrive</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualRefresh();
                  }}
                  className="mt-3 rounded bg-brand-cherry px-3 py-1 text-[10px] font-medium text-white hover:bg-brand-cherry/80"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-cherry border-t-transparent" />
                    <p className="mt-2 text-xs text-zinc-400">Loading...</p>
                  </div>
                </div>
              )}
              <img
                ref={imgRef}
                src={streamMode === "live" && streamUrl ? streamUrl : snapshotUrl || ""}
                alt="Camera stream"
                className="h-full w-full cursor-pointer object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </>
          )}
        </div>

        {/* Footer Info */}
        <div className="shrink-0 border-t border-zinc-800/50 px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              {streamMode === "live" ? (
                <>
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-zinc-400">LIVE</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-zinc-400">
                    {lastRefresh.toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
            <div className="text-zinc-500">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for fullscreen view */}
      <CameraStreamModal
        camera={camera}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
