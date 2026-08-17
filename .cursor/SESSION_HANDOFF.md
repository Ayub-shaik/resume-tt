# Cursor session handoff

## Updated
2026-08-17T19:22:00+05:30

## Goal
RocketCV branding, TomorrowTools footers, Profile merge; push to origin.

## Status
in progress

## Done
- Web identity is RocketCV + Play-style folded-document mark (`public/rocketcv-mark.svg`).
- TomorrowTools is in ProductFooter (web) / bottom chrome (Android).
- Profile is one destination: account, allowlist, Sign out.
- Public host remains https://resume.tomorrowtools.dev

## Next steps
1. Push this repo to origin/master.
2. Rename Google OAuth consent screen away from AesthetIQ (Console).
3. Ship a new Play APK when ready.

## Gotchas
- Do not commit `.env.*` or the shared allowlist sqlite.
- `rocketcv.tomorrowtools.dev` is not live DNS.

## Open decisions
- Whether to add Cloudflare DNS for rocketcv.tomorrowtools.dev.
