import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import {
  improveJsonResume,
  improveResumeText,
  structureResumeToJson,
  tailorJsonResume,
} from "@/lib/ats/structure";
import { JsonResumeSchema } from "@/lib/ats/jsonresume";
import { createResume } from "@/lib/db";
import { formatResumeDisplayName } from "@/lib/context";
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

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const requestId = req.headers.get("x-request-id") || randomUUID();

  const rl = rateLimit({
    key: `${ctx.user.id}:ats:structure`,
    limit: 12,
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
      action: z.enum(["structure", "tailor", "improve"]).default("structure"),
      // Mobile encodes absent optionals as null — accept nullish.
      resumeText: z.string().max(LIMITS.resume).nullish(),
      jdText: z.string().max(LIMITS.jd).nullish(),
      instruction: z.string().max(4000).nullish(),
      jsonResume: z.unknown().nullish(),
      saveAsResume: z.boolean().nullish(),
    })
    .safeParse(body.data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(
      issue?.message
        ? `Invalid body: ${issue.path.join(".") || "payload"} ${issue.message}`
        : "Invalid body",
      400,
    );
  }

  const override = req.headers.get("x-tt-override") === "true";
  const action = parsed.data.action === "improve" ? "improve" : "structure";
  let job = acquireUserAiJob(ctx.user.id, action);
  if (!job && override) {
    cancelUserAiJob(ctx.user.id);
    job = acquireUserAiJob(ctx.user.id, action);
  }
  if (!job) {
    const active = getUserAiJob(ctx.user.id);
    console.warn(`[ats/structure ${requestId}] rejected overlapping request`);
    return jsonError(
      "An earlier ATS request is still running. Cancel it and retry to replace it.",
      409,
      { code: "AI_JOB_ACTIVE", jobId: active?.jobId, activeAction: active?.action },
    );
  }

  try {
    const memoryContext = getMemoryContext(ctx.user.id, `resume:${ctx.user.id}`);
    const recovery = await runRecoveryJob({
      userId: ctx.user.id,
      action: `ats.${parsed.data.action}`,
      idempotencyKey: req.headers.get("x-idempotency-key") || requestId,
      request: parsed.data,
      provider: process.env.AI_PROVIDER || "openclaw",
      execute: async () => {
        if (parsed.data.action === "structure") {
          const text = sanitizeText(parsed.data.resumeText || "", LIMITS.resume);
          if (!text) throw new Error("resumeText required");
          return {
            kind: "structure" as const,
            out: await structureResumeToJson({
              resumeText: text,
              memoryContext,
              sessionKey: `ats-structure-${ctx.user.id}`,
              signal: job.controller.signal,
            }),
          };
        }
        const jd = sanitizeText(parsed.data.jdText || "", LIMITS.jd);
        if (parsed.data.action === "improve") {
          const instruction = sanitizeText(parsed.data.instruction || "", 4000);
          if (!instruction) throw new Error("instruction required");
          if (parsed.data.jsonResume) {
            return {
              kind: "improve" as const,
              out: await improveJsonResume({
                jsonResume: JsonResumeSchema.parse(parsed.data.jsonResume),
                instruction,
                jdText: jd,
                memoryContext,
                sessionKey: `ats-improve-${ctx.user.id}`,
                signal: job.controller.signal,
              }),
            };
          }
          const text = sanitizeText(parsed.data.resumeText || "", LIMITS.resume);
          if (!text) throw new Error("jsonResume or resumeText required");
          return {
            kind: "improve" as const,
            out: await improveResumeText({
              resumeText: text,
              instruction,
              jdText: jd,
              memoryContext,
              sessionKey: `ats-improve-${ctx.user.id}`,
              signal: job.controller.signal,
            }),
          };
        }
        return {
          kind: "tailor" as const,
          out: await tailorJsonResume({
            jsonResume: JsonResumeSchema.parse(parsed.data.jsonResume),
            jdText: jd,
            memoryContext,
            sessionKey: `ats-tailor-json-${ctx.user.id}`,
            signal: job.controller.signal,
          }),
        };
      },
    });
    if (!recovery.result) {
      return jsonOk({ recoveryJobId: recovery.job.id, status: recovery.job.status, checkpoint: recovery.job.checkpoint }, 202);
    }
    const { kind, out } = recovery.result;
    const filename = kind === "structure"
      ? "structured-resume.json"
      : kind === "improve"
        ? "improved-resume.json"
        : "tailored-resume.json";
    const saved = parsed.data.saveAsResume === false
      ? null
      : createResume(formatResumeDisplayName(filename), out.markdown, ctx.user.id);
    const response = { ...out, resume: saved, recoveryJobId: recovery.job.id };
    updateRecoveryJob(recovery.job.id, { result: response });
    saveMemorySnapshot({
      userId: ctx.user.id,
      resourceId: `resume:${ctx.user.id}`,
      kind: `ats.${kind}`,
      summary: out.markdown,
      sourceCursor: recovery.job.id,
    });
    return jsonOk(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/structure ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiJob(ctx.user.id, job.token);
  }
}
