import { NextRequest, NextResponse } from "next/server";
import { frameStorage } from "@/lib/frameStorage";

export const runtime = "nodejs";

/**
 * POST /api/cameras/[id]/frame
 *
 * Receive JPEG frame from ESP32 camera
 * ESP32 POSTs raw JPEG binary data with Content-Type: image/jpeg
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get content type
    const contentType = request.headers.get("content-type") || "image/jpeg";

    // Validate content type
    if (!contentType.includes("image/jpeg") && !contentType.includes("image/jpg")) {
      return NextResponse.json(
        { error: "Content-Type must be image/jpeg" },
        { status: 400 }
      );
    }

    // Read binary frame data
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate frame size (reject if too small or too large)
    if (buffer.length < 100) {
      return NextResponse.json(
        { error: "Frame too small - possible corrupt data" },
        { status: 400 }
      );
    }

    if (buffer.length > 5 * 1024 * 1024) {
      // 5MB limit
      return NextResponse.json(
        { error: "Frame too large - exceeds 5MB limit" },
        { status: 413 }
      );
    }

    // Verify JPEG signature (first 3 bytes should be FF D8 FF)
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return NextResponse.json(
        { error: "Invalid JPEG format - missing JPEG signature" },
        { status: 400 }
      );
    }

    // Store frame
    frameStorage.setFrame(id, buffer, contentType);

    // Return success
    return NextResponse.json(
      {
        success: true,
        cameraId: id,
        size: buffer.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Frame upload error:", err);
    return NextResponse.json(
      { error: "Failed to process frame", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cameras/[id]/frame
 *
 * Get frame upload statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const hasFrame = frameStorage.hasFrame(id);
    const frameAge = frameStorage.getFrameAge(id);

    if (!hasFrame) {
      return NextResponse.json(
        {
          cameraId: id,
          hasFrame: false,
          message: "No recent frame available",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cameraId: id,
      hasFrame: true,
      frameAge: frameAge,
      frameAgeSeconds: frameAge ? frameAge / 1000 : null,
    });
  } catch (err) {
    console.error("Frame status error:", err);
    return NextResponse.json(
      { error: "Failed to get frame status" },
      { status: 500 }
    );
  }
}
