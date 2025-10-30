import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/cameras/[id]/commands
 *
 * Poll for pending commands (used by CircuitPython device)
 * Returns array of pending commands that need to be executed
 */
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

    // Get all pending commands for this camera
    const { data: commands, error } = await supabase
      .from("camera_commands")
      .select("*")
      .eq("camera_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });  // Oldest first

    if (error) {
      console.error("Error fetching pending commands:", error);
      return NextResponse.json(
        { error: "Failed to fetch commands", details: error.message },
        { status: 500 }
      );
    }

    // Format response for CircuitPython device
    const formattedCommands = (commands || []).map((cmd) => ({
      id: cmd.id,
      type: cmd.command_type,
      params: cmd.command_payload || {},
      created_at: cmd.created_at,
    }));

    return NextResponse.json(
      {
        commands: formattedCommands,
        count: formattedCommands.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/commands:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
