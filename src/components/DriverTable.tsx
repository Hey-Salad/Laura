"use client";

import type { Driver } from "@/types";
import { useState } from "react";

type DriverTableProps = {
  drivers: Driver[];
  onCall: (id: string) => Promise<void>;
};

export const DriverTable = ({ drivers, onCall }: DriverTableProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCall = async (id: string) => {
    setLoadingId(id);
    try {
      await onCall(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur">
      <table className="min-w-full divide-y divide-zinc-800/50 text-sm">
        <thead className="bg-zinc-950 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <tr>
            <th className="px-4 py-3">Driver</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Deliveries</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50 text-zinc-100">
          {drivers.map((driver) => (
            <tr key={driver.id} className="transition-colors hover:bg-zinc-900/50">
              <td className="px-4 py-3 font-medium text-white">{driver.name}</td>
              <td className="px-4 py-3 text-zinc-300">{driver.phone}</td>
              <td className="px-4 py-3 text-brand-peach">{driver.total_deliveries}</td>
              <td className="px-4 py-3 text-white">{driver.rating.toFixed(2)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleCall(driver.id)}
                  disabled={loadingId === driver.id}
                  className="rounded-lg bg-brand-cherry px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-cherry/80 hover:shadow-lg hover:shadow-brand-cherry/20 disabled:opacity-50"
                >
                  {loadingId === driver.id ? "Calling..." : "Call driver"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
