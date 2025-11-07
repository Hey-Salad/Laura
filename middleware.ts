import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/verify", "/auth/callback"];

// API routes that should be public
const PUBLIC_API_ROUTES = [
  "/api/auth/send-magic-link",
  "/api/twilio/prompt",
  "/api/cameras", // ESP32 camera endpoints
  "/api/ai", // AI integration endpoints (OpenAI, ElevenLabs) for reCamera
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session tokens from cookies
  const accessToken = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  // If no tokens, redirect to login
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    // If trying to access a protected page, save it for redirect after login
    if (pathname !== "/" && !pathname.startsWith("/api/")) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token with Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase configuration missing in middleware");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Verify the session
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Token is invalid, try to refresh
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshData.session) {
          // Update cookies with new tokens
          const response = NextResponse.next();
          response.cookies.set({
            name: "sb-access-token",
            value: refreshData.session.access_token,
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
          response.cookies.set({
            name: "sb-refresh-token",
            value: refreshData.session.refresh_token,
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
          return response;
        }
      }

      // Refresh failed or no refresh token, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      // Clear invalid cookies
      response.cookies.delete("sb-access-token");
      response.cookies.delete("sb-refresh-token");
      return response;
    }

    // Valid session, allow request
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png (favicon files)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
