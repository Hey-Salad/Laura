"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, CameraStatusUpdate } from "@/types/camera";
import CameraList from "@/components/cameras/CameraList";
import CameraControl from "@/components/cameras/CameraControl";
import CameraInfoPanel from "@/components/cameras/CameraInfoPanel";
import CameraStreamPreview from "@/components/cameras/CameraStreamPreview";
import PhotoGallery from "@/components/cameras/PhotoGallery";
import CameraMapView from "@/components/cameras/CameraMapView";
import CommandHistory from "@/components/cameras/CommandHistory";
import { useToast } from "@/lib/hooks/useToast";
import { Camera as CameraIcon, RefreshCw } from "lucide-react";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { error, success } = useToast();

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || null;

  useEffect(() => {
    fetchCameras();
    setupRealtimeSubscription();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cameras");
      if (!response.ok) throw new Error("Failed to fetch cameras");

      const data = await response.json();
      setCameras(data.cameras || []);

      // Auto-select first camera if none selected
      if (data.cameras?.length > 0 && !selectedCameraId) {
        setSelectedCameraId(data.cameras[0].id);
      }
    } catch (err) {
      console.error("Error fetching cameras:", err);
      error("Failed to load cameras");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCameras();
    setRefreshing(false);
    success("Cameras refreshed");
  };

  const setupRealtimeSubscription = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase credentials not configured");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Subscribe to cameras table changes
    const cameraChannel = supabase
      .channel("cameras-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cameras",
        },
        (payload) => {
          console.log("Camera update:", payload);

          if (payload.eventType === "INSERT") {
            setCameras((prev) => [...prev, payload.new as Camera]);
          } else if (payload.eventType === "UPDATE") {
            setCameras((prev) =>
              prev.map((camera) =>
                camera.id === payload.new.id ? (payload.new as Camera) : camera
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCameras((prev) => prev.filter((camera) => camera.id !== payload.old.id));
            if (selectedCameraId === payload.old.id) {
              setSelectedCameraId(null);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to individual camera realtime channels for status updates
    cameras.forEach((camera) => {
      const channelName = `camera-${camera.camera_id}`;
      const channel = supabase.channel(channelName);

      channel
        .on("broadcast", { event: "status" }, (payload) => {
          const statusUpdate = payload.payload as CameraStatusUpdate;
          console.log("Status update:", statusUpdate);

          // Update camera in state
          setCameras((prev) =>
            prev.map((c) =>
              c.camera_id === statusUpdate.camera_id
                ? {
                    ...c,
                    battery_level: statusUpdate.data.battery_level,
                    wifi_signal: statusUpdate.data.wifi_signal,
                    status: statusUpdate.data.status,
                    location_lat: statusUpdate.data.location?.lat,
                    location_lon: statusUpdate.data.location?.lon,
                    last_seen: statusUpdate.timestamp,
                  }
                : c
            )
          );
        })
        .on("broadcast", { event: "photo" }, (payload) => {
          console.log("New photo received:", payload);
          success("New photo received from camera");
        })
        .subscribe();
    });

    // Cleanup
    return () => {
      cameraChannel.unsubscribe();
      cameras.forEach((camera) => {
        supabase.channel(`camera-${camera.camera_id}`).unsubscribe();
      });
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-peach border-t-transparent" />
          <p className="text-lg text-zinc-400">Loading cameras...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-[calc(100vh-120px)] overflow-hidden">
      {/* Full-screen Map Background */}
      <div className="absolute inset-0">
        {cameras.some(c => c.location_lat && c.location_lon) ? (
          <CameraMapView
            cameras={cameras}
            selectedCameraId={selectedCameraId || undefined}
            onSelect={(camera) => setSelectedCameraId(camera.id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-950">
            <p className="text-zinc-500">No cameras with location data</p>
          </div>
        )}
      </div>

      {/* Floating Refresh Button */}
      <div className="absolute right-4 top-4 z-10"
        style={{ right: selectedCamera ? '500px' : '16px' }}
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800/50 bg-black/90 px-3 py-2 text-xs font-medium text-white backdrop-blur-xl transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Floating Camera Cards */}
      <div className="absolute left-4 bottom-4 z-10 flex gap-3"
        style={{ maxWidth: selectedCamera ? 'calc(100% - 520px)' : 'calc(100% - 32px)' }}
      >
        {cameras.map((camera) => (
          <button
            key={camera.id}
            onClick={() => setSelectedCameraId(camera.id)}
            className={`rounded-xl border bg-black/90 p-3 backdrop-blur-xl transition-all hover:scale-105 ${
              selectedCameraId === camera.id
                ? "border-brand-cherry"
                : "border-zinc-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                camera.status === "online" ? "bg-green-500" : "bg-zinc-500"
              }`} />
              <div className="text-left">
                <p className="text-xs font-semibold text-white">{camera.camera_id}</p>
                <p className="text-[10px] text-zinc-400">{camera.assigned_to || 'Unassigned'}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Camera Sidebar */}
      {selectedCamera && (
        <div className="absolute right-0 top-0 bottom-0 z-20 w-[480px] overflow-y-auto border-l border-zinc-800/50 bg-black/95 backdrop-blur-xl shadow-2xl">
          {/* Sidebar Header */}
          <div className="sticky top-0 z-10 border-b border-zinc-800/50 bg-black/95 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedCamera.camera_name}</h2>
                <p className="font-mono text-xs text-brand-cherry">{selectedCamera.camera_id}</p>
                {selectedCamera.assigned_to && (
                  <p className="mt-1 text-xs text-zinc-400">📍 {selectedCamera.assigned_to}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedCameraId(null)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Bar */}
            <div className="mt-3 flex items-center gap-3">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                selectedCamera.status === "online"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-zinc-500/10 text-zinc-500"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {selectedCamera.status.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400">
                Last seen: {selectedCamera.last_seen
                  ? new Date(selectedCamera.last_seen).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>

          {/* Video Stream - Large */}
          <div className="p-4">
            <div className="h-[320px]">
              <CameraStreamPreview camera={selectedCamera} />
            </div>
          </div>

          {/* Device Stats */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3">
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  (selectedCamera.battery_level || 0) > 60 ? "text-green-500" :
                  (selectedCamera.battery_level || 0) > 30 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {selectedCamera.battery_level || 0}%
                </div>
                <div className="text-[10px] text-zinc-500">Battery</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  (selectedCamera.wifi_signal || -100) > -60 ? "text-green-500" :
                  (selectedCamera.wifi_signal || -100) > -75 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {selectedCamera.wifi_signal || 'N/A'}
                </div>
                <div className="text-[10px] text-zinc-500">WiFi (dBm)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {selectedCamera.location_lat?.toFixed(2) || '--'}
                </div>
                <div className="text-[10px] text-zinc-500">Latitude</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {selectedCamera.location_lon?.toFixed(2) || '--'}
                </div>
                <div className="text-[10px] text-zinc-500">Longitude</div>
              </div>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="px-4 pb-4">
            <CameraControl camera={selectedCamera} />
          </div>

          {/* Command History */}
          <div className="px-4 pb-4">
            <CommandHistory cameraId={selectedCamera.id} />
          </div>

          {/* Device Information */}
          <div className="px-4 pb-4">
            <CameraInfoPanel camera={selectedCamera} />
          </div>

          {/* Photo Gallery */}
          <div className="px-4 pb-4">
            <PhotoGallery cameraId={selectedCamera.id} />
          </div>
        </div>
      )}
    </section>
  );
}
