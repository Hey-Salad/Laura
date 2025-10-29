import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/devices
 * Returns all devices with optional filtering
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const basketId = searchParams.get("basket_id");

    let query = supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (status) {
      query = query.eq("status", status);
    }
    if (basketId) {
      query = query.eq("basket_id", basketId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching devices:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ devices: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices
 * Creates a new device
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const {
      device_id,
      device_name,
      device_type = "meshtastic",
      firmware_version,
      hardware_model,
      mac_address,
      basket_id,
      metadata = {},
    } = body;

    // Validate required fields
    if (!device_id || !device_name) {
      return NextResponse.json(
        { error: "device_id and device_name are required" },
        { status: 400 }
      );
    }

    // Check if device_id already exists
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("device_id", device_id)
      .maybeSingle();

    if (existingDevice) {
      return NextResponse.json(
        { error: "Device with this device_id already exists" },
        { status: 409 }
      );
    }

    // Create the device
    const { data, error } = await supabase
      .from("devices")
      .insert({
        device_id,
        device_name,
        device_type,
        firmware_version,
        hardware_model,
        mac_address,
        basket_id,
        status: "provisioning",
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating device:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ device: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
