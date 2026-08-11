import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { analyzeResumeVsJd } from "@/lib/ats/analyze";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  acquireUserAiJob,
  cancelUserAiJob,
  getUserAiJob,
  rateLimit,
  releaseUserAiJob,
} from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { getMemoryContext, runRecoveryJob, saveMemorySnapshot, updateRecoveryJob } from "@/lib/recovery/store";
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

  const override = req.headers.get("x-tt-override") === "true";
  let job = acquireUserAiJob(ctx.user.id, "analyze");
  if (!job && override) {
    const cancelled = cancelUserAiJob(ctx.user.id);
    if (cancelled) {
      console.warn(
        `[ats/analyze ${requestId}] cancelled job ${cancelled.jobId} for override`,
      );
    }
    job = acquireUserAiJob(ctx.user.id, "analyze");
  }
  if (!job) {
    const active = getUserAiJob(ctx.user.id);
    console.warn(`[ats/analyze ${requestId}] rejected overlapping request`);
    return jsonError(
      "An earlier analyze/improve request is still running. Cancel it and retry to replace it.",
      409,
      {
        code: "AI_JOB_ACTIVE",
        jobId: active?.jobId,
        activeAction: active?.action,
        elapsedSec: active
          ? Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000))
          : undefined,
      },
    );
  }

  try {
    const request = {
      resumeText: sanitizeText(parsed.data.resumeText, LIMITS.resume),
      jdText: sanitizeText(parsed.data.jdText || "", LIMITS.jd),
    };
    const idempotencyKey =
      req.headers.get("x-idempotency-key") || requestId;
    const recovery = await runRecoveryJob({
      userId: ctx.user.id,
      action: "ats.analyze",
      idempotencyKey,
      request,
      provider: process.env.AI_PROVIDER || "openclaw",
      execute: async () =>
        withTimeout(
          analyzeResumeVsJd({
            ...request,
            memoryContext: getMemoryContext(ctx.user.id, `resume:${ctx.user.id}`),
            sessionKey: ephemeralOpenClawSession("ats-analyze", [ctx.user.id]),
            signal: job.controller.signal,
          }),
          ANALYZE_TIMEOUT_MS,
          "ATS analyze",
        ),
    });
    if (!recovery.result) {
      return jsonOk(
        {
          recoveryJobId: recovery.job.id,
          status: recovery.job.status,
          checkpoint: recovery.job.checkpoint,
        },
        202,
      );
    }
    const response = { analysis: recovery.result, recoveryJobId: recovery.job.id };
    updateRecoveryJob(recovery.job.id, { result: response });
    saveMemorySnapshot({
      userId: ctx.user.id,
      resourceId: `resume:${ctx.user.id}`,
      kind: "ats.analyze",
      summary: JSON.stringify({
        action: "analyze",
        analysis: recovery.result,
        resumeChars: request.resumeText.length,
        jdChars: request.jdText.length,
      }),
      sourceCursor: recovery.job.id,
    });
    return jsonOk(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analyze failed";
    const status = /timed out|timeout|aborted|abort/i.test(msg) ? 504 : 502;
    if (status === 504) job.controller.abort();
    console.error(`[ats/analyze ${requestId}] HTTP ${status}: ${msg}`);
    return jsonError(msg, status);
  } finally {
    releaseUserAiJob(ctx.user.id, job.token);
  }
}
