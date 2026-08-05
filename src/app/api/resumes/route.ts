import {
  createResume,
  listResumes,
  updateResumeScore,
  getResume,
  deleteResume,
} from "@/lib/db";
import { formatResumeDisplayName } from "@/lib/context";
import { DEFAULT_SEED_CONTEXT } from "@/lib/prompts";
import { requireSession } from "@/lib/auth/session";
import { scoreResumeAgainstJd } from "@/lib/resume/score";
import { jsonError, jsonOk, readJsonBody, logApi } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import {
  CreateResumeSchema,
  sanitizeText,
  LIMITS,
} from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "resumes:list"),
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }
  return jsonOk({ resumes: listResumes(ctx.user.id) });
}

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "resumes:create"),
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

  const scoreBody = z
    .object({
      action: z.literal("score").optional(),
      resumeId: z.string().uuid().optional(),
      jdText: z.string().max(LIMITS.jd).optional(),
      improve: z.boolean().optional(),
    })
    .safeParse(body.data);

  if (scoreBody.success && scoreBody.data.action === "score") {
    const resume = scoreBody.data.resumeId
      ? getResume(scoreBody.data.resumeId)
      : null;
    if (!resume || (resume.userId && resume.userId !== ctx.user.id)) {
      return jsonError("Resume not found", 404);
    }
    try {
      const scored = await scoreResumeAgainstJd({
        resumeText: resume.content,
        jdText: scoreBody.data.jdText || "",
        improve: false,
        runtimePreference: "openclaw",
        interviewId: `resume-score-${resume.id}`,
      });
      updateResumeScore(resume.id, scored);
      return jsonOk({ resume: getResume(resume.id), score: scored });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : String(e), 502);
    }
  }

  const parsed = CreateResumeSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid body", 400);
  }

  if (parsed.data.seedDefault) {
    const resume = createResume(
      formatResumeDisplayName("Sample profile"),
      DEFAULT_SEED_CONTEXT.resumeText,
      ctx.user.id,
    );
    logApi("POST /api/resumes", { seed: true, id: resume.id });
    return jsonOk({
      resume,
      jdText: DEFAULT_SEED_CONTEXT.jdText,
      jdUrl: DEFAULT_SEED_CONTEXT.jdUrl,
      interviewName: DEFAULT_SEED_CONTEXT.name,
    });
  }

  const content = sanitizeText(parsed.data.content || "", LIMITS.resume);
  if (!content) return jsonError("content required", 400);

  const original =
    sanitizeText(
      parsed.data.originalFilename || parsed.data.name || "Uploaded resume",
      LIMITS.name,
    ) || "Uploaded resume";
  const resume = createResume(
    formatResumeDisplayName(original),
    content,
    ctx.user.id,
  );
  logApi("POST /api/resumes", { id: resume.id, bytes: content.length });
  return jsonOk({ resume }, 201);
}

export async function DELETE(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "resumes:bulk-delete"),
    limit: 30,
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
    .object({ ids: z.array(z.string().uuid()).min(1).max(50) })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("ids required", 400);

  const deleted: string[] = [];
  for (const id of parsed.data.ids) {
    if (deleteResume(id, ctx.user.id)) deleted.push(id);
  }
  logApi("DELETE /api/resumes", {
    userId: ctx.user.id,
    count: deleted.length,
  });
  return jsonOk({ deleted, count: deleted.length });
}
