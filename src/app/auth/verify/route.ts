import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");
    const redirect = url.searchParams.get("redirect") || "/dashboard";

    console.log("Magic link verification for:", email);

    if (!token || !email) {
      console.error("Missing token or email");
      return NextResponse.redirect(
        new URL("/login?error=invalid_link", request.url)
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase not configured");
      return NextResponse.redirect(
        new URL("/login?error=server_error", request.url)
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log("Looking for token in database...");
    console.log("Token:", token);
    console.log("Email:", email);

    // First try to find an unused token
    let magicLinkResult = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .eq("email", email)
      .is("used_at", null)
      .maybeSingle();

    // If not found, check if token was recently used (within last 2 minutes)
    // This handles email client prefetching where the link gets marked as used
    // but the user clicks again shortly after
    if (!magicLinkResult.data) {
      console.log("No unused token found, checking for recently used token...");
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      magicLinkResult = await supabase
        .from("magic_links")
        .select("*")
        .eq("token", token)
        .eq("email", email)
        .gte("used_at", twoMinutesAgo)
        .maybeSingle();

      if (magicLinkResult.data) {
        console.log("Found recently used token, allowing reuse within grace period");
      }
    }

    console.log("Query result:", JSON.stringify(magicLinkResult, null, 2));

    if (magicLinkResult.error || !magicLinkResult.data) {
      console.error("Invalid or expired token");
      console.error("Error:", magicLinkResult.error);
      console.error("Data:", magicLinkResult.data);

      // Check if any token exists at all
      const allTokensResult = await supabase
        .from("magic_links")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(5);

      console.error("Recent tokens for this email:", JSON.stringify(allTokensResult.data, null, 2));

      return NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
    }

    const magicLink = magicLinkResult.data;

    if (new Date(magicLink.expires_at) < new Date()) {
      console.error("Token expired");
      return NextResponse.redirect(
        new URL("/login?error=expired_token", request.url)
      );
    }

    console.log("Token valid, creating or finding user");

    const listResult = await supabase.auth.admin.listUsers();
    let user = listResult.data?.users?.find((u) => u.email === email);

    if (!user) {
      console.log("Creating new user:", email);
      const createResult = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          created_via: "magic_link",
          created_at: new Date().toISOString()
        }
      });

      if (createResult.error || !createResult.data.user) {
        console.error("Failed to create user:", createResult.error);
        return NextResponse.redirect(
          new URL("/login?error=create_user_failed", request.url)
        );
      }

      user = createResult.data.user;
      console.log("User created");
    } else {
      console.log("Existing user found");
    }

    console.log("Generating session link");

    const sessionResult = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (sessionResult.error || !sessionResult.data) {
      console.error("Failed to generate session:", sessionResult.error);
      return NextResponse.redirect(
        new URL("/login?error=session_failed", request.url)
      );
    }

    const hashedToken = sessionResult.data.properties?.hashed_token;

    if (!hashedToken) {
      console.error("No hashed token in response");
      return NextResponse.redirect(
        new URL("/login?error=session_failed", request.url)
      );
    }

    // Mark token as used only after successfully generating the session
    console.log("Marking token as used");
    await supabase
      .from("magic_links")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("token_hash", hashedToken);
    callbackUrl.searchParams.set("type", "magiclink");
    callbackUrl.searchParams.set("next", redirect);

    console.log("Redirecting to callback with next:", redirect);
    return NextResponse.redirect(callbackUrl);
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect(
      new URL("/login?error=server_error", request.url)
    );
  }
}
