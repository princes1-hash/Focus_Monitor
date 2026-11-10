import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  // Forward logout notification to backend if accessible
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    await fetch(`${backendUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: cookieHeader },
    });
  } catch (err) {
    console.warn("Backend logout notification bypassed:", err);
  }

  // Create response and forcibly delete access_token cookie on the frontend domain
  const response = NextResponse.json({
    status: "ok",
    message: "Logged out successfully",
  });

  // Set expired cookie with maxAge=0
  response.cookies.set("access_token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Also call Next.js delete method
  response.cookies.delete("access_token");

  return response;
}
