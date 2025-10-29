import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// GET /api/cameras - List all cameras
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

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");

    let query = supabase
      .from("cameras")
      .select("*")
      .order("last_seen", { ascending: false, nullsFirst: false });

    // Apply filters if provided
    if (status) {
      query = query.eq("status", status);
    }
    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    const { data: cameras, error } = await query;

    if (error) {
      console.error("Error fetching cameras:", error);
      return NextResponse.json(
        { error: "Failed to fetch cameras", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ cameras }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/cameras - Register a new camera
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
      camera_id,
      camera_name,
      device_type = "esp32-s3-ai",
      firmware_version,
      assigned_to,
    } = body;

    // Validate required fields
    if (!camera_id || !camera_name) {
      return NextResponse.json(
        { error: "camera_id and camera_name are required" },
        { status: 400 }
      );
    }

    // Check if camera already exists
    const { data: existing, error: checkError } = await supabase
      .from("cameras")
      .select("*")
      .eq("camera_id", camera_id)
      .single();

    // If camera exists, update and return it
    if (existing && !checkError) {
      const { data: updated, error: updateError } = await supabase
        .from("cameras")
        .update({
          camera_name,
          device_type,
          firmware_version,
          assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq("camera_id", camera_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating camera:", updateError);
        return NextResponse.json(
          { error: "Failed to update camera", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { camera: updated, message: "Camera already exists - updated" },
        { status: 200 }
      );
    }

    // Camera doesn't exist, create new one
    const { data: camera, error } = await supabase
      .from("cameras")
      .insert({
        camera_id,
        camera_name,
        device_type,
        firmware_version,
        assigned_to,
        status: "offline",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating camera:", error);
      return NextResponse.json(
        { error: "Failed to create camera", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ camera }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/cameras:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
