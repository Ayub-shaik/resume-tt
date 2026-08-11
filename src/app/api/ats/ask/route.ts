import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  acquireUserAiJob,
  cancelUserAiJob,
  getUserAiJob,
  rateLimit,
  releaseUserAiJob,
} from "@/lib/security/rateLimit";
import { LIMITS, neutralizeForPrompt, sanitizeText } from "@/lib/security/validate";
import { getMemoryContext, runRecoveryJob, saveMemorySnapshot, updateRecoveryJob } from "@/lib/recovery/store";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const requestId = req.headers.get("x-request-id") || randomUUID();

  const rl = rateLimit({
    key: `${ctx.user.id}:ats:ask`,
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
      question: z.string().min(1).max(4000),
      context: z.string().max(LIMITS.resume).optional(),
      resumeText: z.string().max(LIMITS.resume).optional(),
      jdText: z.string().max(LIMITS.jd).optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("question required", 400);

  const question = sanitizeText(parsed.data.question, 4000);
  const context = sanitizeText(parsed.data.context || "", LIMITS.resume);
  const resumeText = sanitizeText(parsed.data.resumeText || "", LIMITS.resume);
  const jdText = sanitizeText(parsed.data.jdText || "", LIMITS.jd);

  const override = req.headers.get("x-tt-override") === "true";
  let job = acquireUserAiJob(ctx.user.id, "ask", 240_000);
  if (!job && override) {
    cancelUserAiJob(ctx.user.id);
    job = acquireUserAiJob(ctx.user.id, "ask", 240_000);
  }
  if (!job) {
    const active = getUserAiJob(ctx.user.id);
    console.warn(`[ats/ask ${requestId}] rejected overlapping request`);
    return jsonError(
      "An earlier ATS request is still running. Cancel it and retry to replace it.",
      409,
      { code: "AI_JOB_ACTIVE", jobId: active?.jobId, activeAction: active?.action },
    );
  }

  try {
    const request = { question, context, resumeText, jdText };
    const recovery = await runRecoveryJob({
      userId: ctx.user.id,
      action: "ats.ask",
      idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
      request,
      provider: process.env.AI_PROVIDER || "openclaw",
      execute: async () => runOpenClaw(
        [
        {
          role: "system",
          content: `You are an ATS resume coach inside MPI.
Answer briefly (6–12 sentences max). Be concrete. Never invent employers, dates, metrics, or tools not in the resume/context.
If the user asks to rewrite a line, offer one improved version that stays factual.`,
        },
        {
          role: "user",
          content: [
            jdText ? `JD:\n${neutralizeForPrompt(jdText)}\n` : "",
            resumeText
              ? `RESUME (excerpt):\n${neutralizeForPrompt(resumeText.slice(0, 6000))}\n`
              : "",
            context
              ? `FOCUS LINE / SUGGESTION:\n${neutralizeForPrompt(context)}\n`
              : "",
            getMemoryContext(ctx.user.id, `resume:${ctx.user.id}`)
              ? `PRIOR COMPACT MEMORY (continuity only):\n${neutralizeForPrompt(getMemoryContext(ctx.user.id, `resume:${ctx.user.id}`))}\n`
              : "",
            `QUESTION:\n${neutralizeForPrompt(question)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        ],
        {
          sessionKey: ephemeralOpenClawSession("ats-ask", [ctx.user.id]),
          signal: job.controller.signal,
        },
      ),
    });
    if (!recovery.result) {
      return jsonOk(
        { recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint },
        202,
      );
    }
    const response = { reply: recovery.result.text.trim() || "No reply.", recoveryJobId: recovery.job.id };
    updateRecoveryJob(recovery.job.id, { result: response });
    saveMemorySnapshot({
      userId: ctx.user.id,
      resourceId: `resume:${ctx.user.id}`,
      kind: "ats.ask",
      summary: `${question}\n\n${response.reply}`,
      sourceCursor: recovery.job.id,
    });
    return jsonOk(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/ask ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiJob(ctx.user.id, job.token);
  }
}
