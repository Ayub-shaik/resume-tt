import { requireSession } from "@/lib/auth/session";
import { pdfBufferToPngPages } from "@/lib/ats/pdfToPng";
import { jsonError, jsonOk } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

function isPdfFile(name: string, type: string) {
  const lower = name.toLowerCase();
  const mime = type.toLowerCase();
  return mime === "application/pdf" || mime.includes("pdf") || lower.endsWith(".pdf");
}

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "resumes:preview"),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonError("Too many requests", 429, {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart form upload", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("file required", 400);
  }
  if (file.size > 8 * 1024 * 1024) {
    return jsonError("File too large (max 8MB)", 400);
  }
  if (!isPdfFile(file.name, file.type)) {
    return jsonError("Preview rasterization supports PDF only", 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const pages = await pdfBufferToPngPages(buf, { dpi: 130, maxPages: 8 });
    return jsonOk({
      pages: pages.map(
        (page) => `data:image/png;base64,${page.toString("base64")}`,
      ),
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 502);
  }
}
