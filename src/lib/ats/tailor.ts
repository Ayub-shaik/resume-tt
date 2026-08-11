import { runOpenClaw } from "@/lib/runtime/openclaw";
import { ephemeralOpenClawSession } from "@/lib/runtime/sessionKey";
import { neutralizeForPrompt } from "@/lib/security/validate";
import { sanitizeAtsMarkdown } from "@/lib/ats/sanitize";
import { extractJsonObject } from "@/lib/ats/json";

export type AtsTailorResult = {
  resumeMd: string;
  coverMd: string;
  filenameStub: string;
  notes: string[];
};

/** Adapted from automation/job-search tailorSystemPrompt — OpenClaw rewrite. */
export async function tailorResumeForJd(input: {
  resumeText: string;
  jdText: string;
  sessionKey?: string;
  signal?: AbortSignal;
}): Promise<AtsTailorResult> {
  if (!input.jdText.trim()) {
    throw new Error("Job description required to tailor resume");
  }
  if (!input.resumeText.trim()) {
    throw new Error("Resume text required");
  }

  const result = await runOpenClaw(
    [
      {
        role: "system",
        content: `You tailor a CV (and optional short cover) for ONE job.

HARD RULES — ATS + fidelity (from TomorrowTools job-search pipeline):
- Use ONLY facts from the MASTER RESUME. Never invent employers, dates, metrics, certifications, or tools.
- Preserve section order from the MASTER RESUME when present (do not invent a Skills-before-Summary skeleton if the source has Summary first).
  Typical order when unknown: Name → target title → contact → PROFESSIONAL SUMMARY → SKILLS → PROFESSIONAL EXPERIENCE → EDUCATION → CERTIFICATIONS → extras
- Keep same employers, role titles, and date ranges. You may rephrase bullets to match JD vocabulary; do not duplicate bullets that already exist.
- Output resume_md as CLEAN markdown:
  - # for name, ## for section headers, - for bullets
  - Experience: ### Role title, then "Company | City", then dates line, then bullets
- FORBIDDEN (ATS killers): markdown tables, --- rules, emoji/icons, multi-column/HTML, sidebars
- SKILLS as plain dash bullets (e.g. - Cloud: AWS (...))
- Target title line may lean toward JD but stay truthful
- Prefer ~2 pages. Do not drop EDUCATION/CERTIFICATIONS if present.
- Cover letter: markdown, ~1 page, English, no invention.

Return ONLY JSON:
{
  "resume_md": "full markdown resume",
  "cover_md": "full markdown cover letter",
  "filename_stub": "Company_Role_short",
  "notes": ["what you changed"]
}`,
      },
      {
        role: "user",
        content: `JD:\n${neutralizeForPrompt(input.jdText)}\n\nMASTER RESUME:\n${neutralizeForPrompt(input.resumeText)}`,
      },
    ],
    {
      sessionKey: input.sessionKey || ephemeralOpenClawSession("ats-tailor"),
      signal: input.signal,
    },
  );

  const parsed = extractJsonObject(result.text) as {
    resume_md?: string;
    cover_md?: string;
    filename_stub?: string;
    notes?: string[];
  };

  const resumeMd = sanitizeAtsMarkdown(parsed.resume_md || "");
  if (!resumeMd.trim()) {
    throw new Error("Tailor returned empty resume");
  }

  return {
    resumeMd,
    coverMd: sanitizeAtsMarkdown(parsed.cover_md || ""),
    filenameStub: String(parsed.filename_stub || "ATS_Resume").replace(
      /[^\w.-]+/g,
      "_",
    ),
    notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 12) : [],
  };
}
