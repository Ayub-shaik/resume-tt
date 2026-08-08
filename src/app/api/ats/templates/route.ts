import { requireSession } from "@/lib/auth/session";
import { TEMPLATE_META } from "@/lib/ats/templates/shared";
import { jsonError, jsonOk } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:templates"),
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  return jsonOk({
    templates: TEMPLATE_META.map((t) => ({
      id: t.id,
      name: t.name,
      blurb: t.blurb,
      category: t.category,
      accent: t.accent,
    })),
  });
}
