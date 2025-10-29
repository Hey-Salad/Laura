type OrderRow = {
  id: string;
  customer: string;
  status: string;
  etaMinutes?: number;
  basketId: string;
};

export const OrderTable = ({ orders }: { orders: OrderRow[] }) => {
  if (!orders.length) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/60 p-6 text-sm text-zinc-400 backdrop-blur">
        No active orders found. Once deliveries launch they will appear here with live ETA
        projections.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800/50 bg-zinc-950/80 p-6 shadow-lg backdrop-blur">
      <h2 className="text-lg font-semibold text-white">Active Orders</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <article
            key={order.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-950/70 px-4 py-3 transition-all hover:border-brand-cherry/30 hover:bg-zinc-900/50"
          >
            <div>
              <p className="text-sm font-medium text-white">{order.customer}</p>
              <p className="text-xs text-zinc-400">
                Order #{order.id} · Basket {order.basketId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{order.status}</p>
              {order.etaMinutes && (
                <p className="text-sm font-semibold text-brand-peach">{order.etaMinutes} min ETA</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
