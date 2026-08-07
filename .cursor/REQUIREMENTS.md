# Requirements checklist

## Updated
2026-08-07T08:50:00Z

## Task set
Fix blank Show preview / Preview PDF buttons; full-page swipeable template gallery with Select CTA; cull color-clone templates and add structurally distinct layouts.

## Discarded (not must-pass)
- Folio / Reactive Resume Docker embed restoration
- Per-pixel DOCX layout fidelity for original upload mode
- MPI product changes (resume-tt only)
- Authenticated visual QA on resume.tomorrowtools.dev if MCP/auth blocks (local curl + code proof allowed)
- Pixel-perfect copies of every Reactive Resume community template (structural variety is the goal)

## Requirements

### REQ-501
- Description: "Show preview" button must render a visible resume preview (modal/panel), not a blank area — root-cause empty blob, wrong URL, zero-height dialog, Content-Disposition, auth, render API errors, or client state
- Scope: bug fix (Improve/Builder UI handlers for Show preview)
- Dependencies: none
- Status: Complete
- Verification: Root cause = native PDF plugin blank for blob: iframe/object. Live pane now requests format:images + PdfPreview img stack; Show preview scrolls #builder-live-preview into view; min-heights retained

### REQ-502
- Description: "Preview PDF" button must render a visible PDF preview (modal/panel/object), not blank — same root-cause thoroughness as REQ-501
- Scope: bug fix (Improve/Builder UI handlers for Preview PDF)
- Dependencies: none
- Status: Complete
- Verification: renderSelectedPdf("preview") fetches format:images; modal shows PdfPreview page images (not blank iframe); download still PDF blob

### REQ-503
- Description: Tapping a template opens a full-page layout preview popup (not just a small thumbnail select)
- Scope: feature-wide (template gallery UX)
- Dependencies: none
- Status: Complete
- Verification: ResumeBuilder thumb onClick opens TemplateGalleryModal full-viewport with TemplateThumb fullPage

### REQ-504
- Description: Full-page template preview supports swipe left/right through all templates at full length
- Scope: feature-wide (template gallery modal)
- Dependencies: REQ-503
- Status: Complete
- Verification: touch swipe + arrow buttons + keyboard Left/Right cycle all TEMPLATE_META; sheet scrolls full-length layout

### REQ-505
- Description: Each full-page template slide has a "Select template" button at the bottom that applies that template
- Scope: component-wide (gallery modal CTA)
- Dependencies: REQ-503
- Status: Complete
- Verification: footer CTA calls onSelect(current.id) → onTemplateChange; Enter key also selects

### REQ-506
- Description: Remove near-duplicate templates that are only color variants / clones of the same layout structure
- Scope: feature-wide (TEMPLATE_META / template registry)
- Dependencies: none
- Status: Complete
- Verification: Culled azurill/kakuna/parchment/glalie/navy_masthead/skyline/leafish/bronzor/gengar/slate_rail/ditto/ink_dense/graphite/chikorita/coral_split/pikachu/orchid/mint_spine/rhyhorn/amber_folio/cedar/onyx (color/layout clones)

### REQ-507
- Description: Import/add templates with genuinely different layout structures (single column, two-column, sidebar, timeline, header-band, card sections, dense ATS, executive, etc.) from open/RR-inspired sources; prefer fewer better distinct layouts over many recolors; document groups
- Scope: feature-wide (template components + registry + groups)
- Dependencies: REQ-506
- Status: Complete
- Verification: 19 templates; new layouts ats-lines, header-strip, cards, blocks, grid-projects, pull-quote; groups documented in shared.ts; all PDF smoke OK

### REQ-508
- Description: After fixes, rebuild and restart resume-tt-web.service; smoke-test render API for remaining templates
- Scope: application-wide
- Dependencies: REQ-501…507
- Status: Complete
- Verification: npm run build OK; systemctl restart active; HTTP 200; scripts/smoke-templates.mts — 19/19 %PDF + PNG raster OK; authenticated browser MCP blocked (httpcore)

## Notes
- Do not commit `.env*` or secrets
- Prefer structural diversity documentation in gallery groups
