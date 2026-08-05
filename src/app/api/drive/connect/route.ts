import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  createOAuth2Client,
  DRIVE_SCOPES,
  isDriveOAuthConfigured,
} from "@/lib/drive/oauth";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.redirect(
      new URL("/", process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3456"),
    );
  }
  if (!isDriveOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth client not configured" },
      { status: 503 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const oauth2 = createOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state,
    include_granted_scopes: true,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(
    "mpi_drive_oauth",
    JSON.stringify({ state, userId: session.user.id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );
  return res;
}
