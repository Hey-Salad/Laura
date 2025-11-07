import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Validate gimbal command parameters
function validateGimbalCommand(command_type: string, payload: any): { valid: boolean; error?: string } {
  switch (command_type) {
    case "gimbal_set_angle":
      if (typeof payload.yaw_angle !== 'number' || typeof payload.pitch_angle !== 'number') {
        return { valid: false, error: 'yaw_angle and pitch_angle must be numbers' };
      }
      if (payload.yaw_angle < -180 || payload.yaw_angle > 180) {
        return { valid: false, error: 'yaw_angle must be between -180 and 180' };
      }
      if (payload.pitch_angle < -90 || payload.pitch_angle > 90) {
        return { valid: false, error: 'pitch_angle must be between -90 and 90' };
      }
      if (payload.speed && (payload.speed < 1 || payload.speed > 255)) {
        return { valid: false, error: 'speed must be between 1 and 255' };
      }
      break;

    case "gimbal_offset":
      if (typeof payload.yaw_delta !== 'number' || typeof payload.pitch_delta !== 'number') {
        return { valid: false, error: 'yaw_delta and pitch_delta must be numbers' };
      }
      break;

    case "gimbal_preset":
      const validPresets = ['center', 'left', 'right', 'up', 'down'];
      if (!validPresets.includes(payload.preset)) {
        return { valid: false, error: `preset must be one of: ${validPresets.join(', ')}` };
      }
      break;
  }

  return { valid: true };
}

// POST /api/cameras/[id]/command - Send command to camera
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

    const { command_type, payload = {} } = body;

    // Validate required fields
    if (!command_type) {
      return NextResponse.json(
        { error: "command_type is required" },
        { status: 400 }
      );
    }

    // Validate command type
    const validCommands = [
      "take_photo",
      "start_video",
      "stop_video",
      "get_status",
      "update_settings",
      "reboot",
      "led_on",
      "led_off",
      "toggle_led",
      "play_sound",
      "save_photo",
      // Gimbal commands for reCamera
      "gimbal_set_angle",
      "gimbal_offset",
      "gimbal_get_angle",
      "gimbal_preset",
      "gimbal_stop",
    ];

    if (!validCommands.includes(command_type)) {
      return NextResponse.json(
        { error: `Invalid command_type. Must be one of: ${validCommands.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate gimbal command parameters
    if (command_type.startsWith('gimbal_')) {
      const validation = validateGimbalCommand(command_type, payload);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Check if camera exists
    const { data: camera, error: cameraError } = await supabase
      .from("cameras")
      .select("id, camera_id, status")
      .eq("id", id)
      .single();

    if (cameraError || !camera) {
      return NextResponse.json(
        { error: "Camera not found" },
        { status: 404 }
      );
    }

    // Create command record
    const commandId = `cmd-${Date.now()}`;
    const { data: command, error: commandError } = await supabase
      .from("camera_commands")
      .insert({
        camera_id: camera.id,
        command_type,
        command_payload: payload,
        status: "pending",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commandError) {
      console.error("Error creating command:", commandError);
      return NextResponse.json(
        { error: "Failed to create command", details: commandError.message },
        { status: 500 }
      );
    }

    // Broadcast command via Supabase Realtime
    const commandMessage = {
      type: "command",
      command: command_type,
      command_id: commandId,
      timestamp: new Date().toISOString(),
      payload,
    };

    // Send to realtime channel
    const channelName = `camera-${camera.camera_id}`;
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "command",
      payload: commandMessage,
    });

    // Keep status as "pending" so device can poll for it
    // Device will update to "completed" or "failed" after execution

    return NextResponse.json(
      {
        message: "Command sent successfully",
        command: command,
        command_id: commandId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/cameras/[id]/command:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/cameras/[id]/command - Get command history for camera
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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    let query = supabase
      .from("camera_commands")
      .select("*")
      .eq("camera_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: commands, error } = await query;

    if (error) {
      console.error("Error fetching commands:", error);
      return NextResponse.json(
        { error: "Failed to fetch commands", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ commands }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/command:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
