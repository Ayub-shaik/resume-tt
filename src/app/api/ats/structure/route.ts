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
      resumeText: z.string().max(LIMITS.resume).optional(),
      jdText: z.string().max(LIMITS.jd).optional(),
      instruction: z.string().max(4000).optional(),
      jsonResume: z.unknown().optional(),
      saveAsResume: z.boolean().optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("Invalid body", 400);

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
    if (parsed.data.action === "structure") {
      const text = sanitizeText(parsed.data.resumeText || "", LIMITS.resume);
      if (!text) return jsonError("resumeText required", 400);
      const out = await structureResumeToJson({
        resumeText: text,
        sessionKey: `ats-structure-${ctx.user.id}`,
        signal: job.controller.signal,
      });
      let saved = null;
      if (parsed.data.saveAsResume) {
        saved = createResume(
          formatResumeDisplayName("structured-resume.json"),
          out.markdown,
          ctx.user.id,
        );
      }
      return jsonOk({ ...out, resume: saved });
    }

    const jd = sanitizeText(parsed.data.jdText || "", LIMITS.jd);

    if (parsed.data.action === "improve") {
      const instruction = sanitizeText(parsed.data.instruction || "", 4000);
      if (!instruction) return jsonError("instruction required", 400);

      let out;
      if (parsed.data.jsonResume) {
        const jr = JsonResumeSchema.parse(parsed.data.jsonResume);
        out = await improveJsonResume({
          jsonResume: jr,
          instruction,
          jdText: jd,
          sessionKey: `ats-improve-${ctx.user.id}`,
          signal: job.controller.signal,
        });
      } else {
        const text = sanitizeText(parsed.data.resumeText || "", LIMITS.resume);
        if (!text) {
          return jsonError("jsonResume or resumeText required", 400);
        }
        out = await improveResumeText({
          resumeText: text,
          instruction,
          jdText: jd,
          sessionKey: `ats-improve-${ctx.user.id}`,
          signal: job.controller.signal,
        });
      }

      let saved = null;
      if (parsed.data.saveAsResume !== false) {
        saved = createResume(
          formatResumeDisplayName("improved-resume.json"),
          out.markdown,
          ctx.user.id,
        );
      }
      return jsonOk({ ...out, resume: saved });
    }

    const jr = JsonResumeSchema.parse(parsed.data.jsonResume);
    const out = await tailorJsonResume({
      jsonResume: jr,
      jdText: jd,
      sessionKey: `ats-tailor-json-${ctx.user.id}`,
      signal: job.controller.signal,
    });
    let saved = null;
    if (parsed.data.saveAsResume !== false) {
      saved = createResume(
        formatResumeDisplayName("tailored-resume.json"),
        out.markdown,
        ctx.user.id,
      );
    }
    return jsonOk({ ...out, resume: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/structure ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiJob(ctx.user.id, job.token);
  }
}
