# Cursor session handoff

## Updated
2026-08-07T17:40:00Z

## Goal
Unified resume-brain deployed: scoring, v1–v4 tailor, job-search automation, resume-tt speedometer UI.

## Status
done-for-now

## Done
- Merged `feat/resume-brain-unification` → automation `main` (20ce9a5), resume-tt `master` (8a03d1e); pushed both
- Services restarted: `resume-tt-web`, `job-search-ayub-daemon` (active)
- Sync script: `automation/scripts/sync-resume-brain-to-resume-tt.sh`
- Benchmark: `resume-matcher-style` (55/25/20 weights); optional `RESUME_MATCHER_BENCHMARK_URL`
- Snapshots preserved: `snapshot/pre-resume-brain-20260807`

## Next steps
1. Live QA: resume.tomorrowtools.dev → Improve tab → speedometers + v1 improve
2. Telegram: `/job` on 75+ match → v3 PDF; `/improve_the_resume_more` for v2–v4
3. After brain edits: run `automation/scripts/sync-resume-brain-to-resume-tt.sh`
4. Optional: run Resume-Matcher Docker and set `RESUME_MATCHER_BENCHMARK_URL=http://127.0.0.1:3000`

## Gotchas
- `npm install --include=dev` required when `NODE_ENV=production`
- resume-tt uses in-repo `packages/resume-brain` copy (not cross-repo symlink)
- toolfactory = templates/posters only
