import { OrdersClient } from "@/components/orders/OrdersClient";
import { supabase } from "@/lib/supabaseClient";
import { computeCostAndEta } from "@/utils/costTime";

const RESTAURANT_COORDS = {
  lat: 52.52,
  lon: 13.405
};

type OrderRow = {
  id: string;
  customer: string;
  status: string;
  basket_id: string;
  baskets: {
    lat: number;
    lon: number;
  }[] | null;
};

async function getOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer, status, basket_id, baskets(lat, lon)")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching orders:", error);
    return [];
  }

  return data as OrderRow[];
}

export default async function OrdersPage() {
  const orders = await getOrders();
  const mapped = orders.map((order) => {
    const basketCoords = order.baskets?.[0];
    const etaMinutes =
      basketCoords != null
        ? computeCostAndEta(
            { lat: basketCoords.lat, lon: basketCoords.lon },
            RESTAURANT_COORDS
          ).etaMinutes
        : undefined;

    return {
      id: order.id,
      customer: order.customer,
      status: order.status,
      basketId: order.basket_id,
      etaMinutes
    };
  });

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <p className="text-sm text-zinc-400">
          Track delivery progress and connect baskets to customer commitments.
        </p>
      </header>

      <OrdersClient initialOrders={mapped} restaurant={RESTAURANT_COORDS} />
    </section>
  );
}
