# MPI full program design — editorial ATS, RR, taste

**Date:** 2026-08-05  
**Status:** approved in brainstorming (Approach 1); awaiting user review of this written spec  
**Product:** My Personal Interviewer (`interviewprep`) + Reactive Resume (`resume.tomorrowtools.dev`)

## Design read

Full-program redesign and ATS depth for an invite-only interview + ATS studio. Premium editorial language on landing (already shipped Preview B); denser tool dials post-login. Reference depth from a public ATS product was reviewed for score breadth only. MPI analysis UI, metric names, charts, and flows are designed for this product — not a layout or process clone.

## Goals

Deliver tracks A–H in Approach 1 order:

| Phase | Tracks | Outcome |
|-------|--------|---------|
| **P0 Correctness** | Inline Ask, Analyze loading, Improve dedupe, RR margins (+ RR code), Profile multi-delete | Bugs gone; RR pages breathe |
| **P1 ATS depth** | Analyze UI, multi-metric readiness board + lenses, format-preserving editors | Deeper scoring + clearer Analyze UX |
| **P2 Templates** | Visual gallery, distinct RR layout families (not recolors) | Real template choice |
| **P3 Taste** | Studio / ATS / profile chrome | Post-login feels editorial, tool-dense |

## Non-goals

- Inflating template catalogs with recolors or third-party marketing counts  
- Treating color variants as separate templates  
- Replacing Reactive Resume with a new builder  
- Global FIFO OpenClaw queue / changing interview TTS (except shared chrome polish)  
- Pixel-matching any third-party UI

## Architecture

| Layer | Owns | Notes |
|-------|------|--------|
| MPI Next (`/ats`, `/profile`, `/studio`) | Ask UI, Analyze/Improve UX, scoring UI, multi-delete, taste, template gallery → RR handoff | |
| MPI ATS libs (`src/lib/ats/*`) | Prompts, dual-page diff, scoring model, `rr-data` margins, template meta | |
| Reactive Resume (Docker / fork) | Page layout, Leafish CSS padding, in-builder AI | Image today: `amruthpillai/reactive-resume:latest` under `deploy/reactive-resume/` |
| OpenClaw | Model for MPI ATS + RR AI via `/api/rr-ai` → `openclaw/default` | Document as OpenClaw in UI |

**Delivery order:** P0 → P1 → P2 → P3 (sequential commits / PR-train). Prefer correctness before visual forks of the same surfaces.

---

## P0 — Correctness

### P0.1 Inline Ask (no tab jump)

- Remove Analyze Ask Send → `requestTabChange("improve")` (current behavior in `AtsStudio`).
- **Ask** on any suggestion opens an **anchored popover/drawer on that suggestion** (Analyze and Improve).
- Thread keyed by suggestion id; Send uses existing coach/ask (or ATS ask) API; reply stays in the popover.
- Esc / close dismisses; **does not change ATS tab**.

### P0.2 Analyze loading

- While `busy === "analyze"`, show a living status strip with staged copy, e.g.  
  `Parsing resume → Reading JD → Scoring coverage → Building dual view…`
- CTA shows busy state; dual-pane skeleton/shimmer so the page never looks dead.

### P0.3 Improve dedupe

- Normalize suggestion text (whitespace / case / light punct) before emit or render.
- Drop **Add** if line already exists in original or improved body.
- Reorder-only → label **Reorder**, not Add.
- Apply-add no-ops if already present.

### P0.4 RR page margins (MPI + RR)

- MPI: raise defaults in `src/lib/ats/rr-data.ts` (`marginX` / `marginY`; verify RR unit semantics).
- RR: inspect Leafish / shared page chrome in image or fork; if template CSS zeroes padding, **patch and redeploy** `resume.tomorrowtools.dev`.
- **Acceptance:** visible top/bottom air on page 1 and page N; editor and PDF agree.

### P0.5 Profile multi-delete

- Row checkboxes + header **Select all**.
- **Delete selected (N)** with one confirm.
- Prefer `DELETE /api/resumes` body `{ ids: string[] }` (bulk); fall back to parallel per-id if needed.
- Refresh list; clear selection.

### P0.6 RR AI (document only)

- No model swap in P0. Builder AI = OpenClaw via MPI `/api/rr-ai`.

---

## P1 — ATS depth (MPI-owned analysis)

### Analysis presentation

Multi-metric readiness board + lenses (below). Editorial/tool-dense charts. Improve path stays Analyze → Improve → Templates.

### P1.1 Score model (`AtsAnalysis` extension)

Each dimension: `0–100` + short `rationale` string.

| MPI id | Display name (MPI) | Intent |
|--------|--------------------|--------|
| `overall` | **Readiness** | Weighted rollup (hero metric) |
| `atsParse` | **Parser clarity** | Headings, plain-text friendliness |
| `jdCoverage` | **Role coverage** | Soft JD keyword match (keep synonym rules) |
| `impact` | **Evidence density** | Quantified outcomes |
| `seniorityFit` | **Level fit** | Language vs target seniority |
| `recency` | **Recency** | Recent experience vs JD |
| `completeness` | **Section health** | Expected blocks present |
| `contactHygiene` | **Contact hygiene** | Email / LinkedIn / portfolio sanity |
| `signalNoise` | **Signal vs fluff** | Buzzword / repetition penalty |
| `editability` | **Edit readiness** | How concrete next edits are |

Also retain: matched/missing keywords, per-section scores, strengths, gaps, rewriteSuggestions, recommendation enum.

OpenClaw JSON schema + heuristics updated together; heuristic fallback when OpenClaw fails.

### P1.2 Results UI (MPI structure)

After Analyze, a **Results rail** (editorial + tool density):

1. **Readiness board** — hero Readiness + dimension bars/chips (MPI charts)  
2. **Hiring skim** — 4–6 bullets: what a human sees in ~20s  
3. **Parser lens** — parse risks, heading issues, keyword gaps  
4. **Role map** — present / weak / missing vs JD (when JD exists)  
5. **Edit plan** — prioritized Reorder / Rewrite / Add-evidence (deduped per P0)  
6. **Inline Ask** — per suggestion (P0)

Loading strip from P0 while building.

### P1.3 Format-preserving editable resume

- Detect **section order from source**; do not force Skills-before-Summary skeleton.
- Left = AS-IS editable blocks (original order); Right = proposed patches.
- Prompts: `preserveSectionOrder: true` unless user accepts a Reorder patch.
- Optional nicer HTML-from-text for AS-IS — still editable blocks, not dead iframe-only preview.
- Full RR WYSIWYG stays in Templates / RR (out of Analyze).

### P1.4 Analyze page chrome

- Paper/teal editorial tokens; tool density (mpi-ui-taste dials).  
- Dual pane + readiness board; avoid marketing card spam.  
- Primary: Run analysis; secondary: Continue to Improve.

---

## P2 — Templates

### P2.1 Gallery

- Thumbnail + name + category tags; filters; search.  
- Click → preview + Use in builder (RR handoff) and/or MPI HTML preview.

### P2.2 Distinct template rule

- One template = one **layout family** (columns, sidebar, density, date rhythm).  
- Color/theme = **variant** under that id — **not** a separate template.  
- Do not count color variants as separate templates.

### P2.3 Sources

- Map Reactive Resume real layouts → MPI meta (`rrTemplateId`, category, preview PNG).  
- Keep strong MPI HTML templates that map cleanly to RR payload.  
- Static thumbnails under `public/templates/` (or captured once from RR).

### P2.4 RR code

- Fork/build RR as needed for new layouts + margin fixes; redeploy.

---

## P3 — Taste (post-login)

- Apply editorial tokens to studio / ATS / profile chrome (sidebar, app nav, banners, empty states, CTAs).  
- Dials: VARIANCE 4 / MOTION 3 / DENSITY 6 — no landing-hero carnival inside tools.  
- Fraunces section titles, Manrope body, paper/teal/gold, restrained motion.

Landing Preview B already shipped; rebuild + `mpi-web` restart required for production `next start`.

---

## Data / API changes (summary)

| Change | Where |
|--------|--------|
| Extended `AtsAnalysis` JSON | `src/lib/ats/analyze.ts` + Analyze UI |
| Bulk resume delete | `DELETE /api/resumes` `{ ids }` + `ProfileClient` |
| Ask stays on tab | `AtsStudio` / `AnalyzeWorkbench` |
| Dedupe helpers | `src/lib/ats/*` + Improve apply |
| RR margins + template CSS | `rr-data.ts` + RR fork |
| Template meta + thumbs | `templates/shared.ts` + `public/templates/` |

## Testing / acceptance

- Ask Send never switches to Improve/Templates; popover works on Analyze and Improve.  
- Analyze busy shows staged copy; no blank dead pane.  
- Improve does not list Add for existing lines; Reorder labeled correctly.  
- RR A4 pages show clear top/bottom margin on Leafish (and default).  
- Profile: select all / multi-delete works; unauthorized APIs still 401.  
- Analyze shows the readiness dimensions + lenses defined in P1.  
- Template gallery shows thumbnails; color variants nested, not counted as N templates.  
- Post-login chrome visibly editorial without breaking composer / sidebar density.

## Risks

- RR upstream image may ignore payload margins → requires fork.  
- Richer scoring increases OpenClaw latency → keep staged loading + heuristic fallback.  
- Format preserve is hard for arbitrary PDFs → best-effort section detect; document limits.  
- `mpi-web` is production build — UI requires `npm run build` + restart.

## Open decisions (resolved in brainstorming)

- Approach **1** (bug spine → product → templates → taste).  
- RR code changes **in scope**.  
- Metric taxonomy and charts as specified in P1.  
- Templates = distinct layout families only.

## Implementation next step

After user approves this written spec → invoke **writing-plans** for a phased implementation plan (P0 first).
