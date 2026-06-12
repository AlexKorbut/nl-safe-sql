import { NextResponse } from "next/server";
import { verifyMagicLink } from "@/server/auth/magic-link";
import { createSessionToken, getSessionCookie } from "@/server/auth/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/auth/signin?error=invalid", req.url));
  }

  const result = await verifyMagicLink(token, email);

  if (!result.ok) {
    const errorMsg = result.error || "Invalid token";
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorMsg)}`, req.url)
    );
  }

  // Create session
  const sessionToken = await createSessionToken({
    userId: result.userId!,
    email,
    name: email.split("@")[0],
  });

  // Create response with redirect and set cookie
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.headers.set("Set-Cookie", getSessionCookie(sessionToken));

  return response;
}
