import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { JsonResumeSchema } from "@/lib/ats/jsonresume";
import { resumeToDocx, resumeToHtml, resumeToPortableSections } from "@/lib/ats/export";
import { renderResumePdf } from "@/lib/ats/templates";
import { isTemplateId, type TemplateId } from "@/lib/ats/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  let body: { format?: string; template?: string; resume?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = JsonResumeSchema.safeParse(body.resume);
  if (!parsed.success) return jsonError("A validated resume section model is required", 400);
  const format = String(body.format || "json").toLowerCase();
  const name = (parsed.data.basics?.name || "resume").replace(/[^\w.-]+/g, "_");
  if (format === "json") {
    return new Response(JSON.stringify(parsed.data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name}.json"`,
      },
    });
  }
  if (format === "portable-json") {
    return new Response(JSON.stringify(resumeToPortableSections(parsed.data), null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name}-sections.json"`,
      },
    });
  }
  if (format === "html") {
    return new Response(resumeToHtml(parsed.data, name), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.html"`,
      },
    });
  }
  if (format === "doc" || format === "docx") {
    return new Response(new Uint8Array(await resumeToDocx(parsed.data)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
      },
    });
  }
  if (format === "pdf") {
    const requestedTemplate = body.template || "";
    const template: TemplateId = isTemplateId(requestedTemplate)
      ? requestedTemplate
      : "classic";
    return new Response(new Uint8Array(await renderResumePdf(template, parsed.data)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}-${template}.pdf"`,
      },
    });
  }
  return jsonError("Unsupported export format", 400);
}
