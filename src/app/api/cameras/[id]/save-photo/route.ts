import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { frameStorage } from "@/lib/frameStorage";

export const runtime = "nodejs";

/**
 * POST /api/cameras/[id]/save-photo
 *
 * Save the latest frame to Supabase Storage and camera_photos table
 */
export async function POST(
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

    // Get latest frame from storage
    const frame = frameStorage.getFrame(id);

    if (!frame) {
      return NextResponse.json(
        { error: "No recent frame available to save" },
        { status: 404 }
      );
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${camera.camera_id}/${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("camera-photos")
      .upload(filename, frame.buffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("camera-photos")
      .getPublicUrl(filename);

    const photoUrl = urlData.publicUrl;

    // Save to camera_photos table
    const { data: photoRecord, error: dbError } = await supabase
      .from("camera_photos")
      .insert({
        camera_id: id,
        photo_url: photoUrl,
        taken_at: frame.timestamp.toISOString(),
        metadata: {
          size: frame.size,
          frame_age_ms: Date.now() - frame.timestamp.getTime(),
          saved_via: "api",
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save photo record", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        photo: photoRecord,
        message: "Photo saved successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Save photo error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
