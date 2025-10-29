import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const thresholdMinutes = Number(process.env.REWARDS_THRESHOLD_MINUTES ?? 5);

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase server credentials are not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });


  const body = await request.json();
  const { driverId, basketId, minutesUnderEta } = body as {
    driverId?: string;
    basketId?: string;
    minutesUnderEta?: number;
  };

  if (!driverId || !basketId || typeof minutesUnderEta !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (minutesUnderEta < thresholdMinutes) {
    return NextResponse.json(
      { message: "Threshold not met, no rewards updated." },
      { status: 200 }
    );
  }

  const { error } = await supabase.from("driver_rewards").insert({
    driver_id: driverId,
    basket_id: basketId,
    minutes_under_eta: minutesUnderEta
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
