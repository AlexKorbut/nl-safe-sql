import { sendMagicLink } from "@/server/auth/magic-link";

export async function POST(req: Request) {
  try {
    const { email, callbackUrl } = await req.json();

    if (!email || !callbackUrl) {
      return Response.json(
        { error: "Email and callbackUrl required" },
        { status: 400 }
      );
    }

    const result = await sendMagicLink(email, callbackUrl);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      ok: true,
      message: "Check your email for the sign-in link",
    });
  } catch (error) {
    console.error("Auth signin error:", error);
    return Response.json(
      { error: "Failed to process sign in" },
      { status: 500 }
    );
  }
}
