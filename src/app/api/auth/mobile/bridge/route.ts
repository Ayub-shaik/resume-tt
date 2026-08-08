import { requireSession } from "@/lib/auth/session";
import { signMobileToken } from "@/lib/auth/mobileToken";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * After Google sign-in in a Custom Tab / browser, redirect into the Android app
 * with a Bearer token (techbytes-style deep link handoff).
 *
 * Open: /api/auth/signin/google?callbackUrl=/api/auth/mobile/bridge
 */
export async function GET(req: Request) {
  const ctx = await requireSession();
  const url = new URL(req.url);
  const scheme = url.searchParams.get("scheme") || "ttresume";

  if (!ctx) {
    const signIn = new URL("/api/auth/signin/google", url.origin);
    signIn.searchParams.set(
      "callbackUrl",
      `${url.origin}/api/auth/mobile/bridge?scheme=${encodeURIComponent(scheme)}`,
    );
    return NextResponse.redirect(signIn);
  }

  const token = signMobileToken({
    email: ctx.user.email,
    uid: ctx.user.id,
    role: ctx.user.role,
  });
  const deep = `${scheme}://oauth/callback?token=${encodeURIComponent(token)}&email=${encodeURIComponent(ctx.user.email)}`;
  return NextResponse.redirect(deep);
}
