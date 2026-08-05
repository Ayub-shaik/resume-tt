import { requireSession } from "@/lib/auth/session";
import { markdownToPdfBuffer } from "@/lib/ats/pdf";
import { sanitizeAtsMarkdown } from "@/lib/ats/sanitize";
import { jsonError, readJsonBody } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS, sanitizeText } from "@/lib/security/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:pdf"),
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
      markdown: z.string().min(1).max(LIMITS.resume),
      title: z.string().max(120).optional(),
    })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("markdown required", 400);

  try {
    const md = sanitizeAtsMarkdown(
      sanitizeText(parsed.data.markdown, LIMITS.resume),
    );
    const pdf = markdownToPdfBuffer(md, parsed.data.title || "ATS Resume");
    const filename = `${(parsed.data.title || "ATS_Resume").replace(/[^\w.-]+/g, "_")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 502);
  }
}
