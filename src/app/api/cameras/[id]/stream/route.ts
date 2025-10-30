import { NextRequest } from "next/server";
import { frameStorage } from "@/lib/frameStorage";

export const runtime = "nodejs";

/**
 * GET /api/cameras/[id]/stream
 *
 * Serve MJPEG stream from stored frames
 * Browser displays this as: <img src="/api/cameras/[id]/stream" />
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      const boundary = "frame";
      let isActive = true;

      // Send frames at ~10 FPS
      const interval = setInterval(() => {
        if (!isActive) {
          clearInterval(interval);
          return;
        }

        try {
          const frame = frameStorage.getFrame(id);

          if (frame && frame.buffer) {
            // MJPEG format:
            // --boundary
            // Content-Type: image/jpeg
            // Content-Length: [size]
            // [blank line]
            // [JPEG data]
            // [blank line]

            const header = `--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.buffer.length}\r\n\r\n`;

            // Enqueue header
            controller.enqueue(new TextEncoder().encode(header));

            // Enqueue JPEG data
            controller.enqueue(frame.buffer);

            // Enqueue trailing newline
            controller.enqueue(new TextEncoder().encode("\r\n"));
          } else {
            // No frame available - send placeholder or skip
            // For now, we'll just skip and wait for next frame
            console.log(`[Stream ${id}] No frame available`);
          }
        } catch (error) {
          console.error(`[Stream ${id}] Error:`, error);
        }
      }, 100); // 100ms = 10 FPS

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(`[Stream ${id}] Client disconnected`);
        isActive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {
          // Controller may already be closed
        }
      });

      // Log stream start
      console.log(`[Stream ${id}] Started - client connected`);
    },
  });

  // Return streaming response
  return new Response(stream, {
    headers: {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
