import {
  signMobileToken,
  verifyGoogleIdToken,
} from "@/lib/auth/mobileToken";
import {
  getUserByEmail,
  isEmailAllowed,
  upsertUserFromGoogle,
} from "@/lib/auth/store";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = rateLimit({
    key: clientKey(req, "auth:mobile"),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const body = await readJsonBody<unknown>(req);
  if (!body.ok) return jsonError(body.error, 400);
  const parsed = z
    .object({
      idToken: z.string().min(20).max(8_000),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("idToken required", 400);

  const google = await verifyGoogleIdToken(parsed.data.idToken);
  if (!google) return jsonError("Invalid Google ID token", 401);
  if (!isEmailAllowed(google.email)) {
    return jsonError("Email not allowlisted", 403);
  }

  const user = upsertUserFromGoogle({
    email: google.email,
    name: google.name || google.email.split("@")[0] || google.email,
    image: google.picture,
  });
  const row = getUserByEmail(google.email) || user;
  const token = signMobileToken({
    email: row.email,
    uid: row.id,
    role: row.role,
  });

  return jsonOk({
    token,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role,
    },
  });
}
