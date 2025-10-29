import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("Logging out user");

    // Create response with redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));

    // Clear session cookies
    response.cookies.set({
      name: "sb-access-token",
      value: "",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0
    });

    response.cookies.set({
      name: "sb-refresh-token",
      value: "",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0
    });

    console.log("Session cleared, redirecting to login");
    return response;

  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
