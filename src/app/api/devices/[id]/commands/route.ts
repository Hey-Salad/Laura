import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/devices/[id]/commands
 * Returns commands for a specific device
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("device_commands")
      .select("*")
      .eq("device_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching commands:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ commands: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices/[id]/commands
 * Sends a command to a specific device
 */
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

    const { command_type, command_payload = {} } = body;

    if (!command_type) {
      return NextResponse.json(
        { error: "command_type is required" },
        { status: 400 }
      );
    }

    // Verify device exists
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Check if device is in a state that can receive commands
    if (device.status === "decommissioned" || device.status === "inactive") {
      return NextResponse.json(
        { error: `Cannot send commands to ${device.status} devices` },
        { status: 400 }
      );
    }

    // Create the command
    const { data: commandData, error: commandError } = await supabase
      .from("device_commands")
      .insert({
        device_id: id,
        command_type,
        command_payload,
        status: "pending",
      })
      .select()
      .single();

    if (commandError) {
      console.error("Error creating command:", commandError);
      return NextResponse.json(
        { error: commandError.message },
        { status: 500 }
      );
    }

    // TODO: In a real implementation, this would trigger actual device communication
    // For now, we just create the command record in the database
    // The device would poll for pending commands or receive them via MQTT/WebSocket

    return NextResponse.json({ command: commandData }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/devices/[id]/commands/[command_id]
 * Updates a command status (for device acknowledgment)
 */
export async function PATCH(
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
    const body = await request.json();
    const { command_id, status, response, error_message } = body;

    if (!command_id || !status) {
      return NextResponse.json(
        { error: "command_id and status are required" },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === "sent") {
      updateData.sent_at = new Date().toISOString();
    } else if (status === "acknowledged") {
      updateData.acknowledged_at = new Date().toISOString();
    }

    if (response) {
      updateData.response = response;
    }

    if (error_message) {
      updateData.error_message = error_message;
    }

    const { data, error } = await supabase
      .from("device_commands")
      .update(updateData)
      .eq("id", command_id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating command:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Command not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ command: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
