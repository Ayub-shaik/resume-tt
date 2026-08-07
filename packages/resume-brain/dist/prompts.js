const BASE_RULES = `HARD RULES — ATS + fidelity:
- Use ONLY facts from the MASTER RESUME. Never invent employers, dates, metrics, certifications, or tools.
- Preserve section order from the MASTER RESUME when present.
- Keep same employers, role titles, and date ranges. Rephrase bullets to match JD vocabulary; do not duplicate bullets.
- Output resume_md as CLEAN markdown: # name, ## sections, - bullets, ### role titles.
- FORBIDDEN: markdown tables, --- rules, emoji/icons, multi-column/HTML, sidebars.
- SKILLS as plain dash bullets. Target title may lean toward JD but stay truthful.
- Prefer ~2 pages. Do not drop EDUCATION/CERTIFICATIONS if present.`;
const VERSION_HINT = {
    1: "PASS 1 — Make the resume JD-philic: reorder/emphasize skills and bullets already in the master toward the JD (or role/ATS-general if no JD).",
    2: "PASS 2 — Recheck: deepen JD keyword alignment; reorder skill lines so JD-heavy tech appears first when both exist in master.",
    3: "PASS 3 — Recheck: surface existing quantified outcomes from the master more prominently; tighten impact language without inventing numbers.",
    4: "PASS 4 — Final ATS polish: clarity, bullet structure, remove fluff; no new facts.",
};
const FOCUS_HINT = {
    ats: "Optimize primarily for ATS parse clarity and section structure.",
    jd: "Optimize primarily for JD keyword/skill coverage using only existing facts.",
    balanced: "Balance ATS structure and JD alignment.",
};
export function tailorSystemPrompt(version, focus) {
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
export function neutralizeForPrompt(text, max = 14_000) {
    return String(text || "")
        .replace(/```/g, "'''")
        .slice(0, max);
}
//# sourceMappingURL=prompts.js.map