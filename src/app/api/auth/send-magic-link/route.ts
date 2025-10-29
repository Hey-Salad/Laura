import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMagicLinkEmail } from "@/lib/sendgrid";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());

  if (!supabaseUrl || !serviceRoleKey || !appUrl) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    console.log("Admin emails configured:", adminEmails);
    console.log("Requested email:", email);

    if (adminEmails.length > 0 && !adminEmails.includes(email)) {
      console.warn("Unauthorized login attempt:", email);
      console.warn("Email not in whitelist. Configured whitelist:", adminEmails);
      return NextResponse.json({
        success: true,
        message: "If your email is authorized, you will receive a magic link.",
      });
    }

    console.log("Email authorized, proceeding with magic link creation");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const result = await supabase
      .from("magic_links")
      .select("created_at")
      .eq("email", email)
      .gte("created_at", oneMinuteAgo);

    if (result.data && result.data.length >= 3) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const insertResult = await supabase
      .from("magic_links")
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (insertResult.error) {
      console.error("Database error:", insertResult.error);
      return NextResponse.json(
        { error: "Failed to create magic link" },
        { status: 500 }
      );
    }

    console.log("Magic link created for:", email);

    const magicLink = appUrl + "/auth/verify?token=" + token + "&email=" + encodeURIComponent(email);

    const emailSent = await sendMagicLinkEmail(email, magicLink);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Magic link sent! Check your email inbox.",
    });
  } catch (error) {
    console.error("Send magic link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
