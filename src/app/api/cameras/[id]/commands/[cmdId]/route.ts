import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * POST /api/cameras/[id]/commands/[cmdId]
 *
 * Acknowledge command execution (used by CircuitPython device)
 * Updates command status and stores result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cmdId: string }> }
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
    const { id, cmdId } = await params;
    const body = await request.json();

    const { status, result = {} } = body;

    // Validate status
    if (!status || !["completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'completed' or 'failed'" },
        { status: 400 }
      );
    }

    // Update command in database
    const { data: command, error: updateError } = await supabase
      .from("camera_commands")
      .update({
        status: status,
        response: result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", cmdId)
      .eq("camera_id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating command:", updateError);
      return NextResponse.json(
        { error: "Failed to update command", details: updateError.message },
        { status: 500 }
      );
    }

    if (!command) {
      return NextResponse.json(
        { error: "Command not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Command acknowledged",
        command: command,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/cameras/[id]/commands/[cmdId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cameras/[id]/commands/[cmdId]
 *
 * Get specific command details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cmdId: string }> }
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
    const { id, cmdId } = await params;

    const { data: command, error } = await supabase
      .from("camera_commands")
      .select("*")
      .eq("id", cmdId)
      .eq("camera_id", id)
      .single();

    if (error || !command) {
      return NextResponse.json(
        { error: "Command not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ command }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/commands/[cmdId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
