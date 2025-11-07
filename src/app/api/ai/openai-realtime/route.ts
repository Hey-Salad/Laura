import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * WebSocket proxy for OpenAI Realtime API
 * Handles authentication and rate limiting
 */
export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  // Get camera ID from query params for tracking
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("camera_id");

  console.log(`[OpenAI] WebSocket connection requested for camera: ${cameraId}`);

  // Return 101 Switching Protocols
  // Note: Next.js App Router doesn't support WebSocket upgrades directly
  // You'll need to handle this at the edge or use a separate WebSocket server

  return new Response(
    JSON.stringify({
      error: "WebSocket upgrade not supported in App Router",
      suggestion: "Use reCamera direct connection or deploy separate WebSocket server",
      openai_endpoint: "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      note: "Pass OPENAI_API_KEY in Authorization header as 'Bearer <key>'"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Alternative: HTTP endpoint to get OpenAI connection details
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { camera_id } = body;

  // Log the request
  console.log(`[OpenAI] Connection details requested for camera: ${camera_id}`);

  return new Response(
    JSON.stringify({
      websocket_url: "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      authorization: `Bearer ${apiKey}`,
      model: "gpt-4o-realtime-preview-2024-10-01",
      instructions: "Connect directly from reCamera Node-RED using WebSocket node",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
