"use client";

import { useState, useEffect, useRef } from "react";
import { Camera } from "@/types/camera";
import { Video, RefreshCw, AlertCircle, Maximize2 } from "lucide-react";

interface CameraStreamPreviewProps {
  camera: Camera;
}

type StreamMode = "live" | "snapshot" | "photo";

export default function CameraStreamPreview({ camera }: CameraStreamPreviewProps) {
  const [streamMode, setStreamMode] = useState<StreamMode>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const imgRef = useRef<HTMLImageElement>(null);

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
    if (imgRef.current) {
      if (imgRef.current.requestFullscreen) {
        imgRef.current.requestFullscreen();
      }
    }
  };

  useEffect(() => {
    // Initialize snapshot URL for snapshot mode
    if (streamMode === "snapshot") {
      setSnapshotUrl(getSnapshotUrl());
    }
  }, [streamMode]);

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 p-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-brand-cherry" />
          <h3 className="font-semibold text-white">Live Preview</h3>
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
            onClick={handleFullscreen}
            className="rounded-lg bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stream/Preview Area */}
      <div className="relative aspect-video bg-zinc-900">
        {camera.status !== "online" ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">Camera is {camera.status}</p>
              <p className="mt-1 text-xs text-zinc-500">Live preview unavailable</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
              <p className="mt-3 text-sm text-zinc-400">Unable to load stream</p>
              <p className="mt-1 text-xs text-zinc-500">
                {streamMode === "live" ? "MJPEG stream not available" : "Snapshot failed"}
              </p>
              <button
                onClick={handleManualRefresh}
                className="mt-4 rounded-lg bg-brand-cherry px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-cherry/80"
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
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-cherry border-t-transparent" />
                  <p className="mt-3 text-sm text-zinc-400">Loading stream...</p>
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

      {/* Footer Info */}
      <div className="border-t border-zinc-800/50 p-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {streamMode === "live" ? (
              <>
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-zinc-400">LIVE STREAM</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 text-zinc-500" />
                <span className="text-zinc-400">
                  Auto-refresh every 3s • Last: {lastRefresh.toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
          <div className="text-zinc-500">
            {streamMode === "live" ? "MJPEG" : "Snapshot"}
          </div>
        </div>
      </div>
    </div>
  );
}
