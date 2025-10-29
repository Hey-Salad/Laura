import { DriversClient } from "@/components/drivers/DriversClient";
import { supabase } from "@/lib/supabaseClient";
import type { Driver } from "@/types";

async function getDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, phone, total_deliveries, rating")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Error fetching drivers:", error);
    return [];
  }

  return data;
}

export default async function DriversPage() {
  const drivers = await getDrivers();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Driver Roster</h1>
        <p className="text-sm text-zinc-400">
          Check in with on-shift drivers and trigger rapid follow-ups via Twilio voice calls.
        </p>
      </header>

      <DriversClient initialDrivers={drivers} />
    </section>
  );
}
