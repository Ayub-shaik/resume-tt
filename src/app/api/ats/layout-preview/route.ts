import { requireSession } from "@/lib/auth/session";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { JsonResumeSchema } from "@/lib/ats/jsonresume";
import { buildLayoutPreviews } from "@/lib/ats/layoutPreview";
import { jsonError, jsonOk } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:layout-preview"),
    limit: 8,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  let body: { resume?: JsonResume };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = JsonResumeSchema.safeParse(body.resume);
  if (!parsed.success) return jsonError("resume (JSON Resume) required", 400);

  try {
    const layouts = await buildLayoutPreviews(parsed.data);
    return jsonOk({ layouts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Layout preview failed";
    return jsonError(message, 500);
  }
}
