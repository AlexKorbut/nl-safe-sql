import { Resend } from "resend";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY || "fake-key-for-build");

export interface VerificationToken {
  email: string;
  token: string;
  expiresAt: Date;
}

// Store tokens in memory (in prod, use DB or Redis)
const verificationTokens = new Map<string, VerificationToken>();

export async function sendMagicLink(email: string, callbackUrl: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  verificationTokens.set(token, { email, token, expiresAt });

  const signInUrl = new URL(callbackUrl);
  signInUrl.searchParams.set("token", token);
  signInUrl.searchParams.set("email", email);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@google-saas.com",
      to: email,
      subject: "Sign in to GoogleSaas",
      html: `
        <h2>Sign in to GoogleSaas</h2>
        <p>Click the button below to sign in to your account:</p>
        <a href="${signInUrl.toString()}" style="display: inline-block; padding: 12px 24px; background: #6750a4; color: white; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Sign In
        </a>
        <p style="margin-top: 20px; color: #999; font-size: 14px;">
          Or copy this link: <br/>
          <code>${signInUrl.toString()}</code>
        </p>
        <p style="margin-top: 20px; color: #999; font-size: 12px;">
          This link expires in 24 hours.
        </p>
      `,
    });

    return { ok: true, message: "Magic link sent to your email" };
  } catch (error) {
    console.error("Failed to send magic link:", error);
    return { ok: false, error: "Failed to send email" };
  }
}

export async function verifyMagicLink(token: string, email: string) {
  const stored = verificationTokens.get(token);

  if (!stored) {
    return { ok: false, error: "Invalid or expired link" };
  }

  if (stored.email !== email) {
    return { ok: false, error: "Email mismatch" };
  }

  if (stored.expiresAt < new Date()) {
    verificationTokens.delete(token);
    return { ok: false, error: "Link expired" };
  }

  // Clean up token
  verificationTokens.delete(token);

  // Get or create user
  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  if (existingUser) {
    return { ok: true, userId: existingUser.id };
  }

  // Create new user
  const userId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    email,
    name: email.split("@")[0],
    locale: "en",
  });

  return { ok: true, userId };
}
