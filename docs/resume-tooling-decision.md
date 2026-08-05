# Resume builder decision (2026-08-05)

## Decision

MPI uses a **native in-app resume builder** backed by:

- `JsonResume` structured data (`src/lib/ats/jsonresume.ts`)
- Section editor (`src/components/JsonResumeEditor.tsx`)
- Live PDF preview + export via `@react-pdf` templates (`src/lib/ats/templates/*`)
- Builder shell (`src/components/ResumeBuilder.tsx`) in the ATS **Builder** tab

## Removed

Reactive Resume / Folio Docker embed, Postgres handoff, and `/api/rr-ai` proxy were removed after repeated production failures (iframe errors, margin bleed, separate auth).

## Rationale

- Single MPI session — no second Google sign-in
- PDF output matches preview (same render path)
- Templates already had proper page margins in `@react-pdf` (36–40pt padding)
- Content flows Prepare → Analyze → Improve → Builder without external sync

## Ops

No extra containers required. Builder is part of `mpi-web.service` on port 3050.
