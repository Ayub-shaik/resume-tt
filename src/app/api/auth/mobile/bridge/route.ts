import { requireSession } from "@/lib/auth/session";
import { signMobileToken } from "@/lib/auth/mobileToken";
import { publicAppOrigin } from "@/lib/auth/publicOrigin";
import { signIn } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * After Google sign-in in a Custom Tab / browser, redirect into the Android app
 * with a Bearer token (techbytes-style deep link handoff).
 *
 * Android opens: /api/auth/mobile/bridge?scheme=ttresume
 */
export async function GET(req: Request) {
  const ctx = await requireSession();
  const url = new URL(req.url);
  const scheme = url.searchParams.get("scheme") || "ttresume";
  const origin = publicAppOrigin(req);
  const returnTo = `${origin}/api/auth/mobile/bridge?scheme=${encodeURIComponent(scheme)}`;

  if (!ctx) {
    return signIn("google", { redirectTo: returnTo });
  }

  const token = signMobileToken({
    email: ctx.user.email,
    uid: ctx.user.id,
    role: ctx.user.role,
  });
  const deep = `${scheme}://oauth/callback?token=${encodeURIComponent(token)}&email=${encodeURIComponent(ctx.user.email)}`;
  return NextResponse.redirect(deep);
}
