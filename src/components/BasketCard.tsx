import type { Basket } from "@/types";

type BasketCardProps = {
  basket?: Basket;
  restaurant: { lat: number; lon: number };
  compute: (
    basket: { lat: number; lon: number },
    restaurant: { lat: number; lon: number }
  ) => { cost: number; etaMinutes: number; distanceKm: number };
};

export const BasketCard = ({ basket, restaurant, compute }: BasketCardProps) => {
  if (!basket) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-6 text-zinc-400 backdrop-blur">
        Select a basket to view telemetry and cost projections.
      </div>
    );
  }

  const { cost, etaMinutes, distanceKm } = compute(
    { lat: basket.lat, lon: basket.lon },
    restaurant
  );

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-6 shadow-lg shadow-brand-cherry/5 backdrop-blur">
      <header>
        <h2 className="text-xl font-semibold text-white">Basket {basket.id}</h2>
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          Status:{" "}
          <span
            className={
              basket.status === "delayed"
                ? "text-yellow-400"
                : basket.status === "delivered"
                ? "text-emerald-400"
                : "text-brand-cherry"
            }
          >
            {basket.status}
          </span>
        </p>
      </header>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-zinc-800/50 pb-2">
          <dt className="text-zinc-400">Temperature</dt>
          <dd className="font-medium text-white">{basket.temperature ?? "N/A"} °C</dd>
        </div>
        <div className="flex justify-between border-b border-zinc-800/50 pb-2">
          <dt className="text-zinc-400">Driver</dt>
          <dd className="font-medium text-white">{basket.driver?.name ?? "Unassigned"}</dd>
        </div>
        <div className="flex justify-between border-b border-zinc-800/50 pb-2">
          <dt className="text-zinc-400">Distance</dt>
          <dd className="font-medium text-white">{distanceKm} km</dd>
        </div>
        <div className="flex justify-between border-b border-zinc-800/50 pb-2">
          <dt className="text-zinc-400">ETA</dt>
          <dd className="font-medium text-brand-peach">{etaMinutes} min</dd>
        </div>
        <div className="flex justify-between pt-1">
          <dt className="text-zinc-400">Cost</dt>
          <dd className="text-lg font-semibold text-brand-cherry">€{cost.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
};
