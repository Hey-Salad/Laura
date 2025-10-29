import { DevicesClient } from "@/components/devices/DevicesClient";
import { supabase } from "@/lib/supabaseClient";
import type { Device } from "@/types";

async function getDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching devices:", error);
    return [];
  }

  return data;
}

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">IoT Devices</h1>
        <p className="text-sm text-zinc-400">
          Manage Meshtastic devices, monitor telemetry, and provision new hardware.
        </p>
      </header>

      <DevicesClient initialDevices={devices} />
    </section>
  );
}
