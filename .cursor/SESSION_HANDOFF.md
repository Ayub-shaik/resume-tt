# Cursor session handoff

## Updated
2026-10-11T09:40:00+05:30

## Goal
RocketCV revamp: Android card studio (Resume / Fit / Layout), parser-scored layouts filled with the improved resume, web studio following that, public template pages.

## Status
done-for-now (web and APK published)

## Done
- Android `RocketCard` and thick `ScoreRing`. Bottom nav is Resume, Fit, Layout. Fit shows job match as matched/total plus missing rows.
- `POST /api/ats/layout-preview` renders eight layouts to PNG and scores extracted PDF text. Templates API returns only those eight.
- Web studio uses the same steps, ring, and layout cards. `/templates` is public. `/app` and `/profile` are noindex. `robots.ts` and `sitemap.ts` added.
- Published 2026-10-11: web rebuilt and `resume-tt-web.service` restarted. RocketCV APK `1.0.19-layout-studio` versionCode 23 is in `public/downloads/rocketcv-debug-signal.apk` and `apps-manifest.json`.

## Next steps
1. In TT Manager, tap Refresh and update RocketCV (installed build must be below versionCode 23).
2. Walk Resume → Fit → Layout on the updated app.

## Gotchas
- Parser score is text extraction of our PDF, not a commercial ATS.
- Color-alias template ids still render if an old session asks for them; they are not listed.
- `pdftoppm` and `pdftotext` must be on the server.

## Open decisions
- Google OAuth consent screen rename (unchanged).
