/**
 * Extract a JSON object from LLM text. Tolerates fences, prose wrappers,
 * nested braces inside strings, and markdown-only resume fallbacks.
 */
export function extractJsonObject(text: string): Record<string, unknown> {
  const raw = String(text || "").trim();
  if (!raw) {
    throw new Error("No JSON object in model response");
  }

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : raw).trim();

  const balanced = sliceBalancedObject(candidate);
  if (balanced) {
    try {
      return JSON.parse(balanced) as Record<string, unknown>;
    } catch {
      /* try other strategies */
    }
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      /* fall through */
    }
  }

  // Model sometimes returns the resume markdown with no JSON wrapper
  if (looksLikeResumeMarkdown(raw)) {
    return {
      resume_md: raw.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```$/i, "").trim(),
      cover_md: "",
      filename_stub: "ATS_Resume",
      notes: ["Recovered from markdown-only model response"],
    };
  }

  throw new Error("No JSON object in model response");
}

function sliceBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function looksLikeResumeMarkdown(text: string): boolean {
  const t = text.trim();
  if (t.length < 80) return false;
  if (/^#{1,3}\s+\S/m.test(t)) return true;
  if (/\b(experience|education|skills|summary|professional)\b/i.test(t) && t.includes("\n")) {
    return true;
  }
  return false;
}
