import { NextRequest, NextResponse } from "next/server";
import { frameStorage } from "@/lib/frameStorage";

export const runtime = "nodejs";

/**
 * GET /api/cameras/[id]/snapshot
 *
 * Get the latest snapshot (single frame) from camera
 * Returns JPEG image directly
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get latest frame from storage
    const frame = frameStorage.getFrame(id);

    if (!frame) {
      return NextResponse.json(
        { error: "No recent frame available for this camera" },
        { status: 404 }
      );
    }

    // Return JPEG image (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(frame.buffer), {
      status: 200,
      headers: {
        "Content-Type": frame.contentType,
        "Content-Length": frame.size.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Timestamp": frame.timestamp.toISOString(),
        "X-Frame-Age": `${Date.now() - frame.timestamp.getTime()}ms`,
      },
    });
  } catch (err) {
    console.error("Snapshot error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
