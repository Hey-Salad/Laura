import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { supabase } from "@/lib/supabaseClient";
import type { Basket } from "@/types";

const RESTAURANT_COORDS = {
  lat: 52.52,
  lon: 13.405
};

async function getBaskets(): Promise<Basket[]> {
  const { data, error } = await supabase
    .from("baskets")
    .select(
      [
        "id",
        "lat",
        "lon",
        "temperature",
        "driver_id",
        "status",
        "cost",
        "time_estimate",
        "updated_at",
        "drivers(id, name, phone, total_deliveries, rating)"
      ].join()
    )
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching baskets:", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    lat: row.lat,
    lon: row.lon,
    temperature: row.temperature,
    driver_id: row.driver_id,
    status: row.status,
    cost: row.cost,
    time_estimate: row.time_estimate,
    updated_at: row.updated_at,
    driver: row.drivers
      ? {
          id: row.drivers.id,
          name: row.drivers.name,
          phone: row.drivers.phone,
          total_deliveries: row.drivers.total_deliveries,
          rating: row.drivers.rating
        }
      : null
  }));
}

export default async function DashboardPage() {
  const baskets = await getBaskets();

  return (
    <section>
      <DashboardClient initialBaskets={baskets} restaurant={RESTAURANT_COORDS} />
    </section>
  );
}
