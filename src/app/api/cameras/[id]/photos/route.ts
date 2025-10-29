import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// GET /api/cameras/[id]/photos - Get photos for a specific camera
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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get photos
    const { data: photos, error } = await supabase
      .from("camera_photos")
      .select("*")
      .eq("camera_id", id)
      .order("taken_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching photos:", error);
      return NextResponse.json(
        { error: "Failed to fetch photos", details: error.message },
        { status: 500 }
      );
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("camera_photos")
      .select("*", { count: "exact", head: true })
      .eq("camera_id", id);

    if (countError) {
      console.error("Error counting photos:", countError);
    }

    return NextResponse.json(
      {
        photos,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/cameras/[id]/photos - Create a new photo record (called by ESP32)
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

    const { photo_url, thumbnail_url, command_id, metadata = {} } = body;

    // Validate required fields
    if (!photo_url) {
      return NextResponse.json(
        { error: "photo_url is required" },
        { status: 400 }
      );
    }

    // Check if camera exists
    const { data: camera, error: cameraError } = await supabase
      .from("cameras")
      .select("id")
      .eq("id", id)
      .single();

    if (cameraError || !camera) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: 404 }
      );
    }

    // Insert photo record
    const { data: photo, error: photoError } = await supabase
      .from("camera_photos")
      .insert({
        camera_id: camera.id,
        photo_url,
        thumbnail_url,
        command_id,
        metadata,
        taken_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (photoError) {
      console.error("Error creating photo:", photoError);
      return NextResponse.json(
        { error: "Failed to create photo", details: photoError.message },
        { status: 500 }
      );
    }

    // If command_id is provided, update the command status
    if (command_id) {
      await supabase
        .from("camera_commands")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          response: { photo_id: photo.id },
        })
        .eq("command_id", command_id);
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/cameras/[id]/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
