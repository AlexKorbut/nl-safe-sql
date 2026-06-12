import { jwtVerify, SignJWT, type JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "dev-secret-change-me-in-production"
);

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  name?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  return token;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string) {
  return `auth-token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Path=/`;
}

export function getClearSessionCookie() {
  return `auth-token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
}
