import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { twilioClient, twilioFromNumber } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ driver_id: string }> }
) {
  const { driver_id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

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


  const { data: driver, error } = await supabase
    .from("drivers")
    .select("name, phone")
    .eq("id", driver_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (!twilioClient || !appUrl) {
    return NextResponse.json(
      { error: "Twilio credentials are not configured." },
      { status: 500 }
    );
  }

  await twilioClient.calls.create({
    to: driver.phone,
    from: twilioFromNumber,
    url: `${appUrl}/api/twilio/prompt?driver=${encodeURIComponent(driver.name)}`
  });

  return NextResponse.json({ success: true });
}
