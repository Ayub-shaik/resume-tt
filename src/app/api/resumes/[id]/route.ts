import { deleteResume, getResume } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { jsonError, jsonOk, logApi } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { isUuid } from "@/lib/security/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "resumes:get"),
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid resume id", 400);
  const resume = getResume(id);
  if (!resume) return jsonError("Resume not found", 404);
  if (resume.userId && resume.userId !== session.user.id) {
    return jsonError("Resume not found", 404);
  }
  return jsonOk({ resume });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const rl = rateLimit({
    key: clientKey(req, "resumes:delete"),
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError("Invalid resume id", 400);
  const ok = deleteResume(id, session.user.id);
  if (!ok) return jsonError("Resume not found", 404);
  logApi("DELETE /api/resumes/:id", { id, userId: session.user.id });
  return jsonOk({ deleted: true, id });
}
