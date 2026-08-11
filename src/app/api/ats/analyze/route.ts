import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { analyzeResumeVsJd } from "@/lib/ats/analyze";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
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
const ANALYZE_TIMEOUT_MS = 175_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const requestId = req.headers.get("x-request-id") || randomUUID();

  const rl = rateLimit({
    key: `${ctx.user.id}:ats:analyze`,
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
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const resumeIssue = flat.fieldErrors.resumeText?.[0];
    const jdIssue = flat.fieldErrors.jdText?.[0];
    if (resumeIssue) {
      return jsonError(
        resumeIssue.toLowerCase().includes("required") ||
          resumeIssue.toLowerCase().includes("least 1")
          ? "resumeText required"
          : `resumeText invalid: ${resumeIssue}`,
        400,
      );
    }
    if (jdIssue) return jsonError(`jdText invalid: ${jdIssue}`, 400);
    return jsonError("Invalid analyze body (need resumeText)", 400);
  }

  const lockToken = acquireUserAiLock(ctx.user.id);
  if (!lockToken) {
    console.warn(`[ats/analyze ${requestId}] rejected overlapping request`);
    return jsonError("Another analyze/improve request is already in progress. Please wait.", 409);
  }

  try {
    const analysis = await withTimeout(
      analyzeResumeVsJd({
        resumeText: sanitizeText(parsed.data.resumeText, LIMITS.resume),
        jdText: sanitizeText(parsed.data.jdText || "", LIMITS.jd),
        sessionKey: ephemeralOpenClawSession("ats-analyze", [ctx.user.id]),
      }),
      ANALYZE_TIMEOUT_MS,
      "ATS analyze",
    );
    return jsonOk({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analyze failed";
    const status = /timed out|timeout|aborted|abort/i.test(msg) ? 504 : 502;
    console.error(`[ats/analyze ${requestId}] HTTP ${status}: ${msg}`);
    return jsonError(msg, status);
  } finally {
    releaseUserAiLock(ctx.user.id, lockToken);
  }
}
