# Council transcript — Interview Prep recovery
**Timestamp:** 2026-08-02T17:13:19+05:30

## Original question
Why isn't the app matching the original request (dead page, no header/right)? How should we recover?

## Framed question
How should we recover the Interview Prep app so it matches the user's original product request, given what was already built? (Always-on 3-pane studio vs gated wizard; ADO content A/B/C; trust at stake.)

## Anonymization map (revealed after peer review)
| Letter | Advisor |
|--------|---------|
| A | Expansionist |
| B | Executor |
| C | First Principles Thinker |
| D | Contrarian |
| E | Outsider |

## Advisor responses

### The Contrarian
Fatal flaw is architectural: AppShell gates studio behind `selected`. Right column `hidden xl:block` is a spec violation. ADO dump is second landmine — force A vs B before more AI; “Both” doubles scope. Invert shell first. Trust recovered when first 60 seconds behave like mock interview, not form wizard.

### The First Principles Thinker
Give an always-on mock-interview studio; interview is a session inside the room, not a key that unlocks it. Layout is the product. ADO content = (A) calibration, not study library. Dead is a gating bug. One layout pass; wrong path = more AI/PDF/scenarios before shell matches.

### The Expansionist
Ship studio as product; treat ADO pack as compounding engine. Always mount panes. Argues (C) both — live + Study mode. Sequence: always-on chrome, browsable scenarios, thin scenario-aware prompt. Exceed the brief.

### The Outsider
User asked for studio, got wizard. Always render panes; auto-draft; delete xl hide. Treat ADO as (C) phased: Now short calibration; Later Study tab. Match center stack literally. One afternoon of shell beats week of adapters.

### The Executor
Stop rebuilding. Fix shell: (1) always 3-pane + auto-draft 2–3h, (2) kill xl:block 1h, (3) banner spanning + wire uploads 2h. Pick ADO (A) today. Acceptance: open :3456 → full studio without clicking. One UI PR.

## Peer reviews (all 5)
Unanimous: **Strongest = B (Executor)**. **Biggest blind spot = A (Expansionist)** for doubling scope with study library now.
Shared misses flagged: voice UX, auto-draft lifecycle/junk, post-xl layout, runtime reliability, center-pane IA audit, post-layout smoke of start→answer→eval.

## Chairman synthesis
See council-report HTML / verdict below.
