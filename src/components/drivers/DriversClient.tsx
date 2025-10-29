"use client";

import type { Driver } from "@/types";
import { useState, useEffect } from "react";
import { DriverTable } from "@/components/DriverTable";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/lib/hooks/useToast";

type DriversClientProps = {
  initialDrivers: Driver[];
};

export const DriversClient = ({ initialDrivers }: DriversClientProps) => {
  const [drivers, setDrivers] = useState(initialDrivers);
  const toast = useToast();

  // Real-time subscriptions for driver changes
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase credentials not configured");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel("drivers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          console.log("Driver change detected:", payload);

          if (payload.eventType === "INSERT") {
            setDrivers((prev) => [payload.new as Driver, ...prev]);
            toast.success("New driver added");
          } else if (payload.eventType === "UPDATE") {
            setDrivers((prev) =>
              prev.map((driver) =>
                driver.id === payload.new.id ? (payload.new as Driver) : driver
              )
            );
          } else if (payload.eventType === "DELETE") {
            setDrivers((prev) =>
              prev.filter((driver) => driver.id !== payload.old.id)
            );
            toast.info("Driver removed");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleCall = async (id: string) => {
    await fetch(`/api/call/${id}`, { method: "POST" });
    toast.success("Calling driver...");
  };

  return <DriverTable drivers={drivers} onCall={handleCall} />;
};
