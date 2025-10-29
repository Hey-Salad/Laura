import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const next = url.searchParams.get("next") || "/dashboard";

    console.log("Auth callback received:", { type, next });

    if (!tokenHash || type !== "magiclink") {
      console.error("Invalid callback parameters");
      return NextResponse.redirect(
        new URL("/login?error=invalid_callback", request.url)
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase not configured");
      return NextResponse.redirect(
        new URL("/login?error=server_error", request.url)
      );
    }

    // Create Supabase client for establishing session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log("Verifying OTP with token_hash");

    // Verify the OTP token and establish session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink"
    });

    if (error || !data.session) {
      console.error("Failed to verify OTP:", error);
      return NextResponse.redirect(
        new URL("/login?error=verification_failed", request.url)
      );
    }

    console.log("Session established for user:", data.user?.email);

    // Create response with redirect
    const response = NextResponse.redirect(new URL(next, request.url));

    // Set session cookies
    response.cookies.set({
      name: "sb-access-token",
      value: data.session.access_token,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    response.cookies.set({
      name: "sb-refresh-token",
      value: data.session.refresh_token,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    console.log("Redirecting to:", next);
    return response;

  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server_error", request.url)
    );
  }
}
