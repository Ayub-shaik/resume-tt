import { createHmac, timingSafeEqual } from "crypto";

export type MobileTokenPayload = {
  email: string;
  uid: string;
  role: string;
  exp: number;
};

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "mpi-dev-secret-change-me"
  );
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj: unknown) {
  return b64url(JSON.stringify(obj));
}

function sign(data: string) {
  return b64url(createHmac("sha256", secret()).update(data).digest());
}

export function signMobileToken(input: {
  email: string;
  uid: string;
  role: string;
  ttlSec?: number;
}): string {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({
    email: input.email.toLowerCase(),
    uid: input.uid,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSec ?? 60 * 60 * 24 * 30),
  } satisfies MobileTokenPayload);
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const body = `${header}.${payload}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as MobileTokenPayload;
    if (!json.email || !json.uid || !json.exp) return null;
    if (json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

/** Verify Google ID token via tokeninfo; accepts web + Android client IDs. */
export async function verifyGoogleIdToken(idToken: string): Promise<{
  email: string;
  name: string | null;
  picture: string | null;
} | null> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    email?: string;
    email_verified?: string;
    name?: string;
    picture?: string;
    aud?: string;
  };
  const email = data.email?.toLowerCase();
  if (!email || data.email_verified === "false") return null;

  const fromList =
    process.env.GOOGLE_ANDROID_CLIENT_IDS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  const allowedAud = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID_RESUME,
    process.env.GOOGLE_ANDROID_CLIENT_ID_MPI,
    ...fromList,
  ].filter(Boolean);
  if (allowedAud.length && data.aud && !allowedAud.includes(data.aud)) {
    return null;
  }
  return {
    email,
    name: data.name || null,
    picture: data.picture || null,
  };
}
