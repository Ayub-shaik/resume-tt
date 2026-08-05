import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { createOAuth2Client } from "@/lib/drive/oauth";
import {
  getUserDriveToken,
  upsertUserDriveToken,
} from "@/lib/drive/store";

export const runtime = "nodejs";

function appBase() {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://127.0.0.1:3456"
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err || !code || !state) {
    return NextResponse.redirect(`${appBase()}/app?drive=denied`);
  }

  const jar = await cookies();
  const raw = jar.get("mpi_drive_oauth")?.value;
  let expected: { state?: string; userId?: string } = {};
  try {
    expected = raw ? JSON.parse(raw) : {};
  } catch {
    expected = {};
  }

  if (!expected.state || !expected.userId || expected.state !== state) {
    return NextResponse.redirect(`${appBase()}/app?drive=invalid`);
  }

  try {
    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    const existing = getUserDriveToken(expected.userId);
    const refreshToken = tokens.refresh_token || existing?.refreshToken;
    if (!refreshToken) {
      return NextResponse.redirect(`${appBase()}/app?drive=norefresh`);
    }
    oauth2.setCredentials(tokens);
    let googleEmail: string | null = existing?.googleEmail || null;
    try {
      const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
      const me = await oauth2Api.userinfo.get();
      googleEmail = me.data.email || googleEmail;
    } catch {
      /* optional */
    }
    upsertUserDriveToken({
      userId: expected.userId,
      refreshToken,
      googleEmail,
    });
  } catch {
    return NextResponse.redirect(`${appBase()}/app?drive=error`);
  }

  const res = NextResponse.redirect(`${appBase()}/app?drive=connected`);
  res.cookies.set("mpi_drive_oauth", "", { path: "/", maxAge: 0 });
  return res;
}
