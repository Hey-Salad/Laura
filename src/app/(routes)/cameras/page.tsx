"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Camera, CameraStatusUpdate } from "@/types/camera";
import CameraList from "@/components/cameras/CameraList";
import CameraControl from "@/components/cameras/CameraControl";
import PhotoGallery from "@/components/cameras/PhotoGallery";
import { useToast } from "@/lib/hooks/useToast";
import { Camera as CameraIcon, RefreshCw } from "lucide-react";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

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
    } catch (error) {
      console.error("Error fetching cameras:", error);
      showToast({
        type: "error",
        message: "Failed to load cameras",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCameras();
    setRefreshing(false);
    showToast({
      type: "success",
      message: "Cameras refreshed",
    });
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
          showToast({
            type: "success",
            message: "New photo received from camera",
          });
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
    <section className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CameraIcon className="h-8 w-8 text-brand-cherry" />
          <div>
            <h1 className="text-3xl font-bold text-white">Camera Control</h1>
            <p className="text-sm text-zinc-400">
              Manage and control your ESP32-S3 AI cameras remotely
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Camera List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Cameras ({cameras.length})
        </h2>
        <CameraList
          cameras={cameras}
          selectedCameraId={selectedCameraId || undefined}
          onSelectCamera={setSelectedCameraId}
        />
      </div>

      {/* Selected Camera Controls */}
      {selectedCamera ? (
        <div className="space-y-6">
          <CameraControl camera={selectedCamera} />
          <PhotoGallery cameraId={selectedCamera.id} />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-8 text-center backdrop-blur">
          <p className="text-zinc-400">
            {cameras.length === 0
              ? "No cameras registered. Connect your ESP32-S3 cameras to get started."
              : "Select a camera to view controls and photos."}
          </p>
        </div>
      )}
    </section>
  );
}
