import { resolvePreferredRuntime } from "@/lib/runtime";
import { jsonError, jsonOk } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit({
    key: clientKey(req, "runtime"),
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const preferred = resolvePreferredRuntime();
  // Never expose tokens/keys — only capability flags + model ids.
  return jsonOk({
    preferred,
    hasCursor: Boolean(process.env.CURSOR_API_KEY?.trim()),
    hasOpenClaw: Boolean(process.env.OPENCLAW_GATEWAY_TOKEN?.trim()),
    cursorModel: process.env.CURSOR_MODEL || "composer-2.5",
    openclawModel: process.env.OPENCLAW_MODEL || "openclaw/default",
  });
}
