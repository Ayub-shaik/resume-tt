import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { tailorResumeForJd } from "@/lib/ats/tailor";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { createResume } from "@/lib/db";
import { formatResumeDisplayName } from "@/lib/context";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  acquireUserAiLock,
  rateLimit,
  releaseUserAiLock,
} from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const requestId = req.headers.get("x-request-id") || randomUUID();

  const rl = rateLimit({
    key: `${ctx.user.id}:ats:tailor`,
    limit: 10,
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
      jdText: z.string().min(1).max(LIMITS.jd),
      saveAsResume: z.boolean().optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) {
    return jsonError("resumeText and jdText required", 400);
  }

  const lockToken = acquireUserAiLock(ctx.user.id);
  if (!lockToken) {
    console.warn(`[ats/tailor ${requestId}] rejected overlapping request`);
    return jsonError("Another analyze/improve request is already in progress. Please wait.", 409);
  }

  try {
    const tailored = await tailorResumeForJd({
      resumeText: sanitizeText(parsed.data.resumeText, LIMITS.resume),
      jdText: sanitizeText(parsed.data.jdText, LIMITS.jd),
      sessionKey: ephemeralOpenClawSession("ats-tailor", [ctx.user.id]),
    });

    let saved = null;
    if (parsed.data.saveAsResume !== false) {
      saved = createResume(
        formatResumeDisplayName(`${tailored.filenameStub || "ATS"}.md`),
        tailored.resumeMd,
        ctx.user.id,
      );
    }

    return jsonOk({ ...tailored, resume: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/tailor ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiLock(ctx.user.id, lockToken);
  }
}
