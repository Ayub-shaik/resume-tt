import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  acquireUserAiLock,
  rateLimit,
  releaseUserAiLock,
} from "@/lib/security/rateLimit";
import { LIMITS, neutralizeForPrompt, sanitizeText } from "@/lib/security/validate";
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

  const lockToken = acquireUserAiLock(ctx.user.id);
  if (!lockToken) {
    console.warn(`[ats/ask ${requestId}] rejected overlapping request`);
    return jsonError("Another ATS request is already in progress. Please wait.", 409);
  }

  try {
    const result = await runOpenClaw(
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
            `QUESTION:\n${neutralizeForPrompt(question)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      {
        sessionKey: ephemeralOpenClawSession("ats-ask", [ctx.user.id]),
      },
    );
    return jsonOk({ reply: result.text.trim() || "No reply." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ats/ask ${requestId}] HTTP 502: ${msg}`);
    return jsonError(msg, 502);
  } finally {
    releaseUserAiLock(ctx.user.id, lockToken);
  }
}
