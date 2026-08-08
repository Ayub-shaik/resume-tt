import { signMobileToken } from "@/lib/auth/mobileToken";
import {
  getUserByEmail,
  isEmailAllowed,
  upsertUserFromGoogle,
  verifyUserPassword,
} from "@/lib/auth/store";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

export const runtime = "nodejs";

/** Email/password → Bearer (same allowlist + password_hash as web Credentials). */
export async function POST(req: Request) {
  const rl = rateLimit({
    key: clientKey(req, "auth:mobile:password"),
    limit: 20,
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
      email: z.string().email().max(320),
      password: z.string().min(1).max(200),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("email and password required", 400);

  const email = parsed.data.email.trim().toLowerCase();
  if (!isEmailAllowed(email)) return jsonError("Email not allowlisted", 403);
  if (!verifyUserPassword(email, parsed.data.password)) {
    return jsonError("Invalid email or password", 401);
  }

  const user =
    getUserByEmail(email) ||
    upsertUserFromGoogle({
      email,
      name: email.split("@")[0] || email,
      image: null,
    });
  const token = signMobileToken({
    email: user.email,
    uid: user.id,
    role: user.role,
  });

  return jsonOk({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
  });
}
