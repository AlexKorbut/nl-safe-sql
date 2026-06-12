import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/server/auth/session";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function auth(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    return {
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
      },
    };
  } catch {
    return null;
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}
