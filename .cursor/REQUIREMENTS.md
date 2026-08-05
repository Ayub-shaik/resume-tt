# Requirements checklist

## Updated
2026-08-05T21:00:00Z

## Task set
Round 3: Remove Reactive Resume entirely; ship native MPI resume builder (fully functional).

## Discarded (not must-pass)
- Reactive Resume / Folio Docker embed (user explicitly rejected)
- RR-style WYSIWYG paginated web preview (PDF preview is must-pass)
- Per-pixel DOCX upload fidelity in builder

## Naming
User-facing tab: **Builder** (not Folio / Reactive Resume).

---

## Round 3 — native builder

### REQ-301
- Description: Remove all Reactive Resume integration from repo (Docker deploy, API routes, rr-* libs, env vars, iframe embed)
- Scope: application-wide
- Dependencies: none
- Status: Done
- Verification: Pending

### REQ-302
- Description: Builder tab must provide full section editor (basics, experience, education, skills, projects, certifications) bound to JsonResume
- Scope: page-wide (`JsonResumeEditor`, Builder tab)
- Dependencies: REQ-301
- Status: Done
- Verification: Pending

### REQ-303
- Description: Builder must show live PDF preview and support preview/download using MPI templates (proper margins, no edge bleed)
- Scope: feature-wide (`ResumeBuilder`, `/api/ats/render`)
- Dependencies: REQ-302
- Status: Done
- Verification: Pending

### REQ-304
- Description: Improve → Continue to Builder must load improved resume without external errors (no iframe, no “something went wrong”)
- Scope: bug fix (ATS flow)
- Dependencies: REQ-301, REQ-302
- Status: Done
- Verification: Pending

### REQ-305
- Description: 15 layout families available in builder gallery with category filter
- Scope: feature-wide (`TEMPLATE_META`, `ResumeBuilder`)
- Dependencies: REQ-303
- Status: Done
- Verification: Pending

### REQ-306
- Description: Browser smoke on `/ats` Builder path after RR removal
- Scope: application-wide
- Dependencies: REQ-301…305
- Status: Pending
- Verification: Pending

---

## Round 2 (REQ-201…213)

Superseded by REQ-301…306 for builder/Folio items. Prepare/Analyze/Improve fixes from round 2 remain in codebase.
