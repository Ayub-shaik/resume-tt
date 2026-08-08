import { requireSession } from "@/lib/auth/session";
import {
  createAtsSession,
  deleteAtsSession,
  getAtsSession,
  listAtsSessions,
  updateAtsSession,
  type AtsSessionStep,
} from "@/lib/db";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";

const StepSchema = z.enum([
  "prepare",
  "analyze",
  "improve",
  "builder",
  "brand",
]);

export async function GET(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "ats:sessions:list"),
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const row = getAtsSession(id);
    if (!row || row.userId !== ctx.user.id) return jsonError("Not found", 404);
    return jsonOk({ session: row });
  }
  return jsonOk({ sessions: listAtsSessions(ctx.user.id) });
}

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "ats:sessions:write"),
    limit: 40,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const body = await readJsonBody<unknown>(req);
  if (!body.ok) return jsonError(body.error, 400);

  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().max(LIMITS.name).optional(),
      step: StepSchema.optional(),
      resumeText: z.string().max(LIMITS.resume).optional(),
      jdText: z.string().max(LIMITS.jd).optional(),
      originalText: z.string().max(LIMITS.resume).optional(),
      improvedText: z.string().max(LIMITS.resume).optional(),
      jsonResume: z.unknown().optional(),
      analysis: z.unknown().optional(),
      templateId: z.string().max(40).nullable().optional(),
      delete: z.boolean().optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("Invalid body", 400);
  const d = parsed.data;

  if (d.delete && d.id) {
    const ok = deleteAtsSession(d.id, ctx.user.id);
    if (!ok) return jsonError("Not found", 404);
    return jsonOk({ deleted: true });
  }

  const jsonResumeJson =
    d.jsonResume !== undefined ? JSON.stringify(d.jsonResume) : undefined;
  const analysisJson =
    d.analysis !== undefined ? JSON.stringify(d.analysis) : undefined;

  if (d.id) {
    const existing = getAtsSession(d.id);
    if (!existing || existing.userId !== ctx.user.id) {
      return jsonError("Not found", 404);
    }
    const session = updateAtsSession(d.id, {
      name: d.name !== undefined ? sanitizeText(d.name, LIMITS.name) : undefined,
      step: d.step as AtsSessionStep | undefined,
      resumeText:
        d.resumeText !== undefined
          ? sanitizeText(d.resumeText, LIMITS.resume)
          : undefined,
      jdText:
        d.jdText !== undefined ? sanitizeText(d.jdText, LIMITS.jd) : undefined,
      originalText:
        d.originalText !== undefined
          ? sanitizeText(d.originalText, LIMITS.resume)
          : undefined,
      improvedText:
        d.improvedText !== undefined
          ? sanitizeText(d.improvedText, LIMITS.resume)
          : undefined,
      jsonResumeJson,
      analysisJson,
      templateId: d.templateId,
    });
    return jsonOk({ session });
  }

  const name =
    sanitizeText(d.name || "", LIMITS.name) ||
    `ATS ${new Date().toLocaleString()}`;
  const session = createAtsSession({
    userId: ctx.user.id,
    name,
    step: (d.step as AtsSessionStep) || "prepare",
    resumeText: sanitizeText(d.resumeText || "", LIMITS.resume),
    jdText: sanitizeText(d.jdText || "", LIMITS.jd),
    originalText: sanitizeText(d.originalText || "", LIMITS.resume),
    improvedText: sanitizeText(d.improvedText || "", LIMITS.resume),
    jsonResumeJson: jsonResumeJson ?? null,
    analysisJson: analysisJson ?? null,
    templateId: d.templateId ?? null,
  });
  return jsonOk({ session });
}
