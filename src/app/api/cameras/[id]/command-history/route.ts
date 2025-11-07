import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/cameras/[id]/command-history
 *
 * Get command history for a camera (for dashboard display)
 * Returns recent commands with their status and results
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

    // Get recent commands (last 20)
    const { data: commands, error } = await supabase
      .from("camera_commands")
      .select("*")
      .eq("camera_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching command history:", error);
      return NextResponse.json(
        { error: "Failed to fetch command history", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        commands: commands || [],
        count: commands?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/cameras/[id]/command-history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
