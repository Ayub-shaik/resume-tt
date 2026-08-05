# Cursor session handoff

## Updated
2026-08-05T19:05:00Z

## Goal
Fix Studio preview bugs + redesign Analyze → Improve → Folio per user QA.

## Status
ready for user QA

## Done
- Studio: Save context no longer remounts banner (preview blob kept); Show original gated without file
- Analyze: button = Analyzing…; stages in center empty panel; Apply all / Re-analyze / Ask·include all
- Improve: shows working draft from Analyze first; Start improving → further refinements; readiness scores; Modified/Original toggle; no OpenClaw copy
- Folio rename (was Reactive Resume); collapsible layouts ribbon; iframe fills height; cache-bust Load; Preview pulls Folio DB via `/api/ats/rr-pull`
- Embed strip: `inject-folio-chrome.mjs` hides AI Assistant / Analyze / Picture heuristics
- Removed OpenClaw `/api/rr-ai` explainer line

## Next steps
1. User QA Studio save + show original
2. User QA Analyze → Improve draft sync → Folio Load template switch
3. Acceptance-review Pass/Fail on REQUIREMENTS REQ-101…110

## Gotchas
- Folio = RR MIT image with MPI patches; recreate container after entrypoint/inject changes
- Re-Load into Folio after template pick so DB+iframe refresh
- Do not commit `.cursor/artifacts/` or `deploy/reactive-resume/.env`

## Open decisions
- Further content-panel stripping in Folio if AI/Analyze buttons still visible (DOM probe)
