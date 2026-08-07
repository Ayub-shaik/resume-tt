# Cursor session handoff

## Updated
2026-08-07T08:50:00Z

## Goal
Fix blank Show preview / Preview PDF (user QA); full-page swipeable template gallery; cull color clones; add structurally distinct layouts.

## Status
ready for user QA

## Done
- Root cause of blank Show/Preview PDF: Chromium/Firefox often render blank native PDF plugins for `blob:` URLs in iframe/object (prior min-height/object fix insufficient)
- Fix: `/api/ats/render` `format: "images"` → pdftoppm PNG pages; `PdfPreview` img stack in Improve live pane + Preview PDF modal; “Open PDF in new tab” on demand
- TemplateGalleryModal: full-page swipe (touch/arrows/keys) through all templates; Select template CTA
- Culled color-clone shells; 19 structurally distinct templates (Classic/Modern/Sidebar/Compact/Creative/Executive/Tech) including ats_lines, header_strip, cards, blocks, grid_projects, pull_quote
- Rebuild + resume-tt-web.service restart; smoke 19/19 PDF + PNG OK
- Branch: `cursor/fix-preview-gallery-templates-06f7`

## Next steps
1. User QA: Preview PDF modal shows page images; Show preview shows live stack on mobile
2. User QA: tap template → full-page gallery → swipe → Select template
3. Optional: fix browser MCP httpcore for authenticated visual QA

## Gotchas
- Do not commit `.env*` or `deploy/reactive-resume/.env`
- Preview images need `pdftoppm` (poppler) on the host
- Invalid old draft template IDs fall back to classic via `isTemplateId`
- Render rate limit 20/min — image previews count toward it

## Open decisions
- Whether to cache PNG previews client-side across template switches
