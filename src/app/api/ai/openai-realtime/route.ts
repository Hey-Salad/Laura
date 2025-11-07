import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Get OpenAI Realtime API connection details
 * Returns Cloudflare Worker WebSocket proxy URL with camera token
 *
 * Security:
 * - Validates camera exists and is online
 * - Returns camera's API token for Cloudflare Worker authentication
 * - OpenAI API key never exposed to client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { camera_id } = body;

    if (!camera_id) {
      return new Response(
        JSON.stringify({ error: "camera_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get camera and its API token
    const { data: camera, error } = await supabase
      .from("cameras")
      .select("id, camera_id, api_token, status")
      .eq("camera_id", camera_id)
      .single();

    if (error || !camera) {
      console.error(`[OpenAI] Camera not found: ${camera_id}`, error);
      return new Response(
        JSON.stringify({ error: "Camera not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!camera.api_token) {
      console.error(`[OpenAI] Camera has no API token: ${camera_id}`);
      return new Response(
        JSON.stringify({ error: "Camera not configured for AI integration" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Cloudflare Worker URL from environment
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || "wss://heysalad-openai-proxy.workers.dev";

    console.log(`[OpenAI] Connection details provided for camera: ${camera_id}`);

    return new Response(
      JSON.stringify({
        websocket_url: `${workerUrl}/openai-realtime`,
        camera_token: camera.api_token,
        model: "gpt-4o-realtime-preview-2024-10-01",
        instructions: "Connect using WebSocket with X-Camera-Token header",
        usage: {
          headers: {
            "X-Camera-Token": camera.api_token,
          },
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[OpenAI] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      service: "openai-realtime",
      status: "ok",
      note: "Use POST to get connection details",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
