import { requireSession } from "@/lib/auth/session";
import { extractResumeText } from "@/lib/resume/extract";
import { jsonError, jsonOk } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/security/rateLimit";
import { LIMITS } from "@/lib/security/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const rl = rateLimit({
    key: clientKey(req, "resumes:parse"),
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

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const text = (await extractResumeText(buf, file.name, file.type)).slice(
      0,
      LIMITS.resume,
    );
    return jsonOk({
      text,
      filename: file.name,
      bytes: buf.length,
      chars: text.length,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 400);
  }
}
