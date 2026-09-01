import type { ImproveFocus, ResumeVersion } from "./types.js";

const BASE_RULES = `HARD RULES — ATS + fidelity:
- Use ONLY facts from the MASTER RESUME. Never invent employers, dates, metrics, certifications, or tools.
- Preserve section order from the MASTER RESUME when present.
- Keep same employers, role titles, and date ranges. Rephrase bullets to match JD vocabulary; do not duplicate bullets.
- Output resume_md as CLEAN markdown: # name, ## sections, - bullets, ### role titles.
- FORBIDDEN: markdown tables, --- rules, emoji/icons, multi-column/HTML, sidebars.
- SKILLS as plain dash bullets. Target title may lean toward JD but stay truthful.
- Prefer ~2 pages. Do not drop EDUCATION/CERTIFICATIONS if present.
- Keep internal enterprise tool names from the master (e.g. Horizon CI, ATAAS, bank-specific platforms) with a brief parenthetical when helpful for external readers — do not strip them as "unknown".
- STACK-WEIGHTING (when USER FOCUS asks for X-heavy / X-front / emphasize X): changing Skills order alone is NOT enough. You MUST also:
  1) Headline / title line under the name — lead with X (and related tools) when those facts exist; do not lead with a competing stack.
  2) Professional summary — open with X; put competing stacks later or secondary.
  3) Experience — for each role that has X-related work in master/current draft, move those bullets earlier; lead with X workstreams; keep competing-stack bullets truthful but later/shorter.
  4) Skills — put X before competing clouds/tools.
  Reject a draft that only swaps Skills order while headline/summary/experience still lead with the de-emphasized stack.`;

const VERSION_HINT: Record<ResumeVersion, string> = {
  1: "PASS 1 — Make the resume JD-philic: reorder/emphasize headline, summary, skills, AND experience bullets already in the master toward the JD (or role/ATS-general if no JD).",
  2: "PASS 2 — Recheck: deepen JD/stack alignment across headline, summary, skills, AND experience — not skills-only. Lead experience bullets with the emphasized stack when those facts exist.",
  3: "PASS 3 — Recheck: if USER FOCUS asked for a stack-heavy rewrite and headline/summary/experience still lead with a competing stack, fix that before polishing numbers.",
  4: "PASS 4 — Final ATS polish: clarity, bullet structure, remove fluff; no new facts. Preserve the stack-weighting from earlier passes.",
};

const FOCUS_HINT: Record<ImproveFocus, string> = {
  ats: "Optimize primarily for ATS parse clarity and section structure.",
  jd: "Optimize primarily for JD keyword/skill coverage using only existing facts.",
  balanced: "Balance ATS structure and JD alignment.",
};

export function tailorSystemPrompt(version: ResumeVersion, focus: ImproveFocus): string {
  return `You tailor a CV (and optional short cover) for ONE job.

${BASE_RULES}
${VERSION_HINT[version]}
${FOCUS_HINT[focus]}

Return ONLY JSON:
{
  "resume_md": "full markdown resume",
  "cover_md": "full markdown cover letter (empty string if not requested)",
  "filename_stub": "Company_Role_short",
  "notes": ["what you changed"]
}`;
}

export function neutralizeForPrompt(text: string, max = 14_000): string {
  return String(text || "")
    .replace(/```/g, "'''")
    .slice(0, max);
}
