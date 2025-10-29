"use client";

import { useState, useEffect } from "react";
import { OrderTable } from "@/components/OrderTable";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/lib/hooks/useToast";
import { computeCostAndEta } from "@/utils/costTime";

type Order = {
  id: string;
  customer: string;
  status: string;
  basketId: string;
  etaMinutes?: number;
};

type OrdersClientProps = {
  initialOrders: Order[];
  restaurant: { lat: number; lon: number };
};

export const OrdersClient = ({ initialOrders, restaurant }: OrdersClientProps) => {
  const [orders, setOrders] = useState(initialOrders);
  const toast = useToast();

  // Real-time subscriptions for order and basket changes
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase credentials not configured");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          console.log("Order change detected:", payload);

          if (payload.eventType === "INSERT") {
            // Fetch basket info for ETA calculation
            const newOrder = await fetchOrderWithETA(supabase, payload.new, restaurant);
            setOrders((prev) => [newOrder, ...prev]);
            toast.success("New order added");
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = await fetchOrderWithETA(supabase, payload.new, restaurant);
            setOrders((prev) =>
              prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
            toast.info("Order removed");
          }
        }
      )
      .subscribe();

    // Subscribe to basket changes (to update ETAs)
    const basketsChannel = supabase
      .channel("baskets-changes-for-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "baskets" },
        async (payload) => {
          // Update orders that reference this basket
          setOrders((prev) =>
            prev.map((order) => {
              if (order.basketId === payload.new.id) {
                const etaMinutes = computeCostAndEta(
                  { lat: payload.new.lat, lon: payload.new.lon },
                  restaurant
                ).etaMinutes;
                return { ...order, etaMinutes };
              }
              return order;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(basketsChannel);
    };
  }, [toast, restaurant]);

  return <OrderTable orders={orders} />;
};

async function fetchOrderWithETA(
  supabase: any,
  orderData: any,
  restaurant: { lat: number; lon: number }
): Promise<Order> {
  // Fetch basket coords
  const { data: basket } = await supabase
    .from("baskets")
    .select("lat, lon")
    .eq("id", orderData.basket_id)
    .maybeSingle();

  const etaMinutes = basket
    ? computeCostAndEta({ lat: basket.lat, lon: basket.lon }, restaurant).etaMinutes
    : undefined;

  return {
    id: orderData.id,
    customer: orderData.customer,
    status: orderData.status,
    basketId: orderData.basket_id,
    etaMinutes,
  };
}
