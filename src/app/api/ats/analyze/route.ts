import { requireSession } from "@/lib/auth/session";
import { analyzeResumeVsJd } from "@/lib/ats/analyze";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:analyze"),
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
      resumeText: z.string().min(1).max(LIMITS.resume),
      jdText: z.string().max(LIMITS.jd).optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("resumeText required", 400);

  const analysis = await analyzeResumeVsJd({
    resumeText: sanitizeText(parsed.data.resumeText, LIMITS.resume),
    jdText: sanitizeText(parsed.data.jdText || "", LIMITS.jd),
    sessionKey: ephemeralOpenClawSession("ats-analyze", [ctx.user.id]),
  });
  return jsonOk({ analysis });
}
