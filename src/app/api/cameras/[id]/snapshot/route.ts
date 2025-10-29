import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get camera info
    const { data: camera, error: cameraError } = await supabase
      .from("cameras")
      .select("*")
      .eq("id", id)
      .single();

    if (cameraError || !camera) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: 404 }
      );
    }

    // Check if camera has a direct snapshot URL in metadata
    if (camera.metadata?.snapshot_url) {
      // Redirect to camera's snapshot URL
      return NextResponse.redirect(camera.metadata.snapshot_url);
    }

    // Otherwise, try to get the latest photo from storage
    const { data: photos, error: photosError } = await supabase
      .from("camera_photos")
      .select("photo_url, thumbnail_url")
      .eq("camera_id", id)
      .order("taken_at", { ascending: false })
      .limit(1);

    if (photosError) {
      return NextResponse.json(
        { error: "Failed to fetch photos", details: photosError.message },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: "No photos available for this camera" },
        { status: 404 }
      );
    }

    // Redirect to the latest photo
    const photoUrl = photos[0].photo_url;
    return NextResponse.redirect(photoUrl);

  } catch (err) {
    console.error("Snapshot error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
