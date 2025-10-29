import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/devices/[id]/telemetry
 * Returns telemetry data for a specific device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase server credentials are not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const since = searchParams.get("since"); // ISO timestamp

    let query = supabase
      .from("device_telemetry")
      .select("*")
      .eq("device_id", id)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte("timestamp", since);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching telemetry:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ telemetry: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices/[id]/telemetry
 * Adds telemetry data for a specific device
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase server credentials are not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      battery_level,
      signal_strength,
      temperature,
      location_lat,
      location_lon,
      speed,
      altitude,
      satellites,
      voltage,
      current,
      rssi,
      snr,
      raw_data = {},
    } = body;

    // Insert telemetry data
    const { data: telemetryData, error: telemetryError } = await supabase
      .from("device_telemetry")
      .insert({
        device_id: id,
        battery_level,
        signal_strength,
        temperature,
        location_lat,
        location_lon,
        speed,
        altitude,
        satellites,
        voltage,
        current,
        rssi,
        snr,
        raw_data,
      })
      .select()
      .single();

    if (telemetryError) {
      console.error("Error inserting telemetry:", telemetryError);
      return NextResponse.json(
        { error: telemetryError.message },
        { status: 500 }
      );
    }

    // Update device with latest telemetry values
    const deviceUpdate: any = {
      last_seen: new Date().toISOString(),
    };

    if (battery_level !== undefined) deviceUpdate.battery_level = battery_level;
    if (signal_strength !== undefined) deviceUpdate.signal_strength = signal_strength;
    if (location_lat !== undefined && location_lon !== undefined) {
      deviceUpdate.location_lat = location_lat;
      deviceUpdate.location_lon = location_lon;
    }

    await supabase.from("devices").update(deviceUpdate).eq("id", id);

    // Check for alert conditions
    const alerts = [];

    // Low battery alert (below 20%)
    if (battery_level !== undefined && battery_level < 20) {
      alerts.push({
        device_id: id,
        alert_type: "low_battery",
        severity: battery_level < 10 ? "critical" : "warning",
        message: `Battery level is at ${battery_level}%`,
        metadata: { battery_level },
      });
    }

    // Signal loss alert (below -100 dBm for RSSI)
    if (rssi !== undefined && rssi < -100) {
      alerts.push({
        device_id: id,
        alert_type: "signal_loss",
        severity: "warning",
        message: `Weak signal detected (RSSI: ${rssi} dBm)`,
        metadata: { rssi },
      });
    }

    // Temperature alert (outside safe range)
    if (temperature !== undefined && (temperature < -10 || temperature > 60)) {
      alerts.push({
        device_id: id,
        alert_type: "temperature",
        severity: temperature < -20 || temperature > 70 ? "critical" : "warning",
        message: `Temperature is ${temperature}°C`,
        metadata: { temperature },
      });
    }

    // Insert alerts if any
    if (alerts.length > 0) {
      await supabase.from("device_alerts").insert(alerts);
    }

    return NextResponse.json({ telemetry: telemetryData, alerts }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
