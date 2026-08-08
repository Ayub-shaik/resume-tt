import { requireSession } from "@/lib/auth/session";
import { buildCareerBrandKit } from "@/lib/ats/careerBrand";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:career-brand"),
    limit: 40,
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
      linkedinText: z.string().max(LIMITS.resume).optional(),
      targetRole: z.string().max(200).optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("resumeText required", 400);

  const kit = buildCareerBrandKit({
    resumeText: sanitizeText(parsed.data.resumeText, LIMITS.resume),
    linkedinText: sanitizeText(parsed.data.linkedinText || "", LIMITS.resume),
    targetRole: sanitizeText(parsed.data.targetRole || "", 200),
  });
  return jsonOk({ kit });
}
