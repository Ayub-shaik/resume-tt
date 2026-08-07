import { requireSession } from "@/lib/auth/session";
import { fetchJobDescriptionFromUrl } from "@/lib/ats/fetchJd";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:jd"),
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
      url: z.string().min(8).max(LIMITS.url),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("url required", 400);

  try {
    const result = await fetchJobDescriptionFromUrl(parsed.data.url);
    return jsonOk(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 400);
  }
}
