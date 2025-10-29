"use client";

import { useState, useEffect, useRef } from "react";
import MapView from "@/components/MapView";
import { BasketCard } from "@/components/BasketCard";
import { computeCostAndEta } from "@/utils/costTime";
import type { Basket } from "@/types";
import { Wifi, WifiOff } from "lucide-react";

type DashboardClientProps = {
  initialBaskets: Basket[];
  restaurant: { lat: number; lon: number };
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type BasketEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Basket;
  old: Partial<Basket>;
};

export const DashboardClient = ({ initialBaskets, restaurant }: DashboardClientProps) => {
  const [baskets, setBaskets] = useState<Basket[]>(initialBaskets);
  const [selected, setSelected] = useState<Basket | undefined>(
    () => initialBaskets[0]
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connectToStream = () => {
      if (!isMounted) return;

      console.log("Connecting to basket stream...");
      setConnectionStatus("connecting");

      const eventSource = new EventSource("/api/baskets/stream");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("ready", () => {
        if (!isMounted) return;
        console.log("Basket stream connected");
        setConnectionStatus("connected");
      });

      eventSource.addEventListener("basket", (event) => {
        if (!isMounted) return;

        try {
          const payload: BasketEvent = JSON.parse(event.data);
          console.log("Basket update received:", payload);

          setBaskets((prevBaskets) => {
            if (payload.eventType === "INSERT") {
              // Add new basket
              return [...prevBaskets, payload.new];
            } else if (payload.eventType === "UPDATE") {
              // Update existing basket
              return prevBaskets.map((basket) =>
                basket.id === payload.new.id ? payload.new : basket
              );
            } else if (payload.eventType === "DELETE") {
              // Remove deleted basket
              return prevBaskets.filter((basket) => basket.id !== payload.old.id);
            }
            return prevBaskets;
          });

          // Update selected basket if it was modified
          setSelected((prevSelected) => {
            if (prevSelected && prevSelected.id === payload.new.id) {
              return payload.new;
            }
            return prevSelected;
          });
        } catch (error) {
          console.error("Error parsing basket event:", error);
        }
      });

      eventSource.addEventListener("heartbeat", () => {
        // Heartbeat received, connection is alive
        if (!isMounted) return;
        setConnectionStatus("connected");
      });

      eventSource.onerror = (error) => {
        if (!isMounted) return;
        console.error("EventSource error:", error);
        setConnectionStatus("error");
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            console.log("Attempting to reconnect...");
            connectToStream();
          }
        }, 5000);
      };
    };

    connectToStream();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Live updates active</span>
            </>
          ) : connectionStatus === "connecting" ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-brand-cherry" />
              <span className="text-xs text-zinc-400">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400">
                {connectionStatus === "disconnected" ? "Disconnected" : "Connection error"}
                {" • Reconnecting..."}
              </span>
            </>
          )}
        </div>
        <div className="text-xs text-zinc-400">
          {baskets.length} basket{baskets.length !== 1 ? "s" : ""} active
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MapView baskets={baskets} onSelect={setSelected} restaurant={restaurant} />
        </div>
        <BasketCard basket={selected} restaurant={restaurant} compute={computeCostAndEta} />
      </div>
    </div>
  );
};
