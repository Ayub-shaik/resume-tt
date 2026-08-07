import { requireSession } from "@/lib/auth/session";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { isTemplateId, renderResumePdf } from "@/lib/ats/templates";
import { jsonError } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "ats:render"),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  let body: { template?: string; resume?: JsonResume };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const template = typeof body.template === "string" ? body.template : "classic";
  if (!isTemplateId(template)) {
    return jsonError("Unknown template", 400);
  }
  if (!body.resume || typeof body.resume !== "object") {
    return jsonError("resume (JSON Resume) required", 400);
  }

  try {
    const pdf = await renderResumePdf(template, body.resume);
    const name = (body.resume.basics?.name || "resume")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 64);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline so browser PDF viewers (and object/iframe) display the preview
        "Content-Disposition": `inline; filename="${name}-${template}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Render failed";
    return jsonError(msg, 500);
  }
}
