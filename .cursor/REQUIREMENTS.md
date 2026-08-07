# Requirements checklist

## Updated
2026-08-07T08:25:00Z

## Task set
Fix blank improved/builder resume previews, original+selected template rendering modes, expand/group ~20 templates (dedupe), fix mobile builder scroll.

## Discarded (not must-pass)
- Folio / Reactive Resume Docker embed restoration (prior round removed RR; builder is native)
- Per-pixel DOCX layout fidelity for “original template” mode (preview original upload when available; otherwise honest PDF of content)
- MPI product changes (do not break MPI; resume-tt only)
- Push/PR unless needed for non-secret persistence (prefer local deploy)

## Requirements

### REQ-401
- Description: Improved resume preview must visibly render (not blank) when Modified mode has content / JsonResume
- Scope: bug fix (`ImproveResumeViewer`, Improve tab in `AtsStudio`)
- Dependencies: none
- Status: Pending
- Verification: Pending

### REQ-402
- Description: Builder live PDF preview must visibly render (not blank) when JsonResume + template are set
- Scope: bug fix (`ResumeBuilder`, `ImproveResumeViewer`, `/api/ats/render`)
- Dependencies: none
- Status: Pending
- Verification: Pending

### REQ-403
- Description: When original-layout mode applies (Original toggle / uploaded file preview available), preview shows the user-uploaded resume layout (AS-IS), not a forced template
- Scope: feature-wide (Improve Original mode + `ResumeAsIsPreview`)
- Dependencies: REQ-401
- Status: Pending
- Verification: Pending

### REQ-404
- Description: When user selects a template, resume renders in that template’s layout in Improve Modified and Builder preview/download
- Scope: feature-wide (`renderResumePdf`, template gallery, Improve/Builder)
- Dependencies: REQ-402
- Status: Pending
- Verification: Pending

### REQ-405
- Description: Add ~20 additional real usable templates from external Reactive Resume / open template packs or equivalent; club into named groups (e.g. Classic, Modern, Sidebar, Compact, Creative); remove near-duplicate / similar shells
- Scope: feature-wide (`TEMPLATE_META`, template components, gallery UI)
- Dependencies: REQ-404
- Status: Pending
- Verification: Pending

### REQ-406
- Description: Builder mobile view scrolls (edit + preview panes); no overflow-hidden + h-screen/h-dvh trap that freezes scroll (same class as MPI fix)
- Scope: bug fix (`AtsStudio` shell, `ResumeBuilder` layout CSS)
- Dependencies: none
- Status: Pending
- Verification: Pending

### REQ-407
- Description: Desktop and mobile both show working previews and scrollable builder after deploy restart of `resume-tt-web.service` (and Folio container only if still used)
- Scope: application-wide
- Dependencies: REQ-401…406
- Status: Pending
- Verification: Pending

## Notes
- Honest templates only — real layouts with content sections, not empty shells
- Preserve existing design system
- Do not commit secrets / `.env*`
