// Mock auth for development - full implementation in next phase

export interface AuthSession {
  user?: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

export async function auth(): Promise<AuthSession | null> {
  // Return null to require auth, or a mock session for development
  return null;
}

export async function signIn() {
  return { ok: true };
}

export async function signOut() {
  return { ok: true };
}

export const handlers = {
  GET: async () => new Response("Auth handler - GET"),
  POST: async () => new Response("Auth handler - POST"),
};
