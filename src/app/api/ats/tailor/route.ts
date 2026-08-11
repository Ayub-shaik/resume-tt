import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { tailorResumeForJd } from "@/lib/ats/tailor";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { createResume } from "@/lib/db";
import { formatResumeDisplayName } from "@/lib/context";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  acquireUserAiJob,
  cancelUserAiJob,
  getUserAiJob,
  rateLimit,
  releaseUserAiJob,
} from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { runRecoveryJob, saveMemorySnapshot } from "@/lib/recovery/store";
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

  const override = req.headers.get("x-tt-override") === "true";
  let job = acquireUserAiJob(ctx.user.id, "improve");
  if (!job && override) {
    const cancelled = cancelUserAiJob(ctx.user.id);
    if (cancelled) {
      console.warn(
        `[ats/tailor ${requestId}] cancelled job ${cancelled.jobId} for override`,
      );
    }
    job = acquireUserAiJob(ctx.user.id, "improve");
  }
  if (!job) {
    const active = getUserAiJob(ctx.user.id);
    console.warn(`[ats/tailor ${requestId}] rejected overlapping request`);
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
      jdText: sanitizeText(parsed.data.jdText, LIMITS.jd),
      saveAsResume: parsed.data.saveAsResume !== false,
    };
    const recovery = await runRecoveryJob({
      userId: ctx.user.id,
      action: "ats.tailor",
      idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
      request,
      provider: process.env.AI_PROVIDER || "openclaw",
      execute: () => tailorResumeForJd({
        ...request,
        sessionKey: ephemeralOpenClawSession("ats-tailor", [ctx.user.id]),
        signal: job.controller.signal,
      }),
    });
    if (!recovery.result) {
      return jsonOk({ recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint }, 202);
    }
    const tailored = recovery.result;

    let saved = null;
    if (parsed.data.saveAsResume !== false) {
      saved = createResume(
        formatResumeDisplayName(`${tailored.filenameStub || "ATS"}.md`),
        tailored.resumeMd,
        ctx.user.id,
      );
    }

    const response = { ...tailored, resume: saved, recoveryJobId: recovery.job.id };
    saveMemorySnapshot({
      userId: ctx.user.id,
      resourceId: recovery.job.id,
      kind: "ats.tailor",
      summary: tailored.resumeMd,
      sourceCursor: recovery.job.id,
    });
    return jsonOk(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/tailor ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiJob(ctx.user.id, job.token);
  }
}
