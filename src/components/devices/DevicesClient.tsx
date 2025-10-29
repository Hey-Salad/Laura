"use client";

import { useState, useEffect } from "react";
import type { Device } from "@/types";
import { DeviceTable } from "@/components/devices/DeviceTable";
import { AlertPanel } from "@/components/devices/AlertPanel";
import { Plus, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/lib/hooks/useToast";

type DevicesClientProps = {
  initialDevices: Device[];
};

export const DevicesClient = ({ initialDevices }: DevicesClientProps) => {
  const [devices, setDevices] = useState(initialDevices);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    device_id: "",
    device_name: "",
    hardware_model: "",
    firmware_version: "",
    mac_address: "",
  });

  // Real-time subscriptions for device changes
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase credentials not configured");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel("devices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        (payload) => {
          console.log("Device change detected:", payload);

          if (payload.eventType === "INSERT") {
            setDevices((prev) => [payload.new as Device, ...prev]);
            toast.success("New device added");
          } else if (payload.eventType === "UPDATE") {
            setDevices((prev) =>
              prev.map((device) =>
                device.id === payload.new.id ? (payload.new as Device) : device
              )
            );
          } else if (payload.eventType === "DELETE") {
            setDevices((prev) =>
              prev.filter((device) => device.id !== payload.old.id)
            );
            toast.info("Device removed");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProvisionDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          device_type: "meshtastic",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to provision device");
      }

      // Device will be added via real-time subscription
      toast.success("Device provisioned successfully!");

      // Reset form and close modal
      setFormData({
        device_id: "",
        device_name: "",
        hardware_model: "",
        firmware_version: "",
        mac_address: "",
      });
      setShowProvisionModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Panel */}
      <AlertPanel />

      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          {devices.length} device{devices.length !== 1 ? "s" : ""} registered
        </div>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-cherry px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-cherry/80 hover:shadow-lg hover:shadow-brand-cherry/20"
        >
          <Plus className="h-4 w-4" />
          Provision Device
        </button>
      </div>

      <DeviceTable devices={devices} />

      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800/50 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Provision New Device</h2>
              <button
                onClick={() => {
                  setShowProvisionModal(false);
                  setError("");
                }}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionDevice} className="space-y-4">
              <div>
                <label htmlFor="device_id" className="block text-sm font-medium text-zinc-300 mb-2">
                  Device ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="device_id"
                  name="device_id"
                  value={formData.device_id}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., MESH-001"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50"
                />
              </div>

              <div>
                <label htmlFor="device_name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Device Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="device_name"
                  name="device_name"
                  value={formData.device_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Basket Tracker 1"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50"
                />
              </div>

              <div>
                <label htmlFor="hardware_model" className="block text-sm font-medium text-zinc-300 mb-2">
                  Hardware Model
                </label>
                <input
                  type="text"
                  id="hardware_model"
                  name="hardware_model"
                  value={formData.hardware_model}
                  onChange={handleInputChange}
                  placeholder="e.g., LILYGO T-Beam"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50"
                />
              </div>

              <div>
                <label htmlFor="firmware_version" className="block text-sm font-medium text-zinc-300 mb-2">
                  Firmware Version
                </label>
                <input
                  type="text"
                  id="firmware_version"
                  name="firmware_version"
                  value={formData.firmware_version}
                  onChange={handleInputChange}
                  placeholder="e.g., 2.1.0"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50"
                />
              </div>

              <div>
                <label htmlFor="mac_address" className="block text-sm font-medium text-zinc-300 mb-2">
                  MAC Address
                </label>
                <input
                  type="text"
                  id="mac_address"
                  name="mac_address"
                  value={formData.mac_address}
                  onChange={handleInputChange}
                  placeholder="e.g., AA:BB:CC:DD:EE:FF"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cherry/50"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProvisionModal(false);
                    setError("");
                  }}
                  className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-brand-cherry px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-cherry/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
