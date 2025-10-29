import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// POST /api/cameras/[id]/status - Update camera status
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
      wifi_signal,
      status,
      location_lat,
      location_lon,
      firmware_version,
      metadata = {},
    } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    // Check if camera exists
    const { data: camera, error: cameraError } = await supabase
      .from("cameras")
      .select("id, camera_id")
      .eq("id", id)
      .single();

    if (cameraError || !camera) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: 404 }
      );
    }

    // Update camera status
    const updateData: any = {
      status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optional fields
    if (battery_level !== undefined) updateData.battery_level = battery_level;
    if (wifi_signal !== undefined) updateData.wifi_signal = wifi_signal;
    if (location_lat !== undefined) updateData.location_lat = location_lat;
    if (location_lon !== undefined) updateData.location_lon = location_lon;
    if (firmware_version !== undefined) updateData.firmware_version = firmware_version;
    if (Object.keys(metadata).length > 0) updateData.metadata = metadata;

    const { data: updated, error: updateError } = await supabase
      .from("cameras")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating camera status:", updateError);
      return NextResponse.json(
        { error: "Failed to update status", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Status updated successfully",
        camera: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/cameras/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/cameras/[id]/status - Get current camera status
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

    const { data: camera, error } = await supabase
      .from("cameras")
      .select("id, camera_id, status, battery_level, wifi_signal, last_seen, location_lat, location_lon")
      .eq("id", id)
      .single();

    if (error || !camera) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: camera }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
