import type { NextAuthOptions } from "next-auth";
import { Resend } from "resend";

export function ResendEmailProvider(
  options: {
    apiKey?: string;
    from?: string;
  }
) {
  const apiKey = options.apiKey || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required");

  const resend = new Resend(apiKey);
  const from = options.from || process.env.RESEND_FROM_EMAIL || "noreply@example.com";

  return {
    id: "email",
    name: "Email",
    type: "email",
    async sendVerificationRequest({
      identifier: email,
      url,
      theme,
    }: {
      identifier: string;
      url: string;
      theme: "light" | "dark";
    }) {
      try {
        await resend.emails.send({
          from,
          to: email,
          subject: "Sign in to GoogleSaas",
          html: `
            <h2>Sign in to GoogleSaas</h2>
            <p>Click the link below to sign in with your email:</p>
            <a href="${url}" style="padding: 10px 20px; background: #6750a4; color: white; border-radius: 8px; text-decoration: none;">
              Sign in
            </a>
            <p>Or copy this link: ${url}</p>
            <p>This link expires in 24 hours.</p>
          `,
        });
      } catch (error) {
        throw new Error(`Failed to send verification email: ${error}`);
      }
    },
    options: options,
  };
}
