# Cursor session handoff

## Updated
2026-08-07T17:20:00Z

## Goal
Unified resume-brain: shared scoring/tailor v1–v4, job-search automation tiers, resume-tt 3-row speedometer UI.

## Status
in progress — P0 implemented, deploy/restart pending

## Done
- Snapshots: `snapshot/pre-resume-brain-20260807` + tags in **resume-tt** and **automation**
- Branches: `feat/resume-brain-unification` (both repos)
- New package: `automation/packages/resume-brain` (scoreTriple, improve chain, fact validator, benchmark stub)
- job-search-ayub: brainAdapter, pipeline uses brain; ≥75% → v3 PDF; `/improve_the_resume_more` command
- resume-tt: `/api/brain/improve`, ImproveSpeedometers UI (3 rows), keywords aligned with brain scoring
- Copy of brain in `resume-tt/packages/resume-brain` for Turbopack (sync via rsync — see brain README)

## Next steps
1. Commit + push both feature branches
2. Restart job-search daemon + resume-tt-web after merge
3. Live test: resume-tt Improve tab speedometers; Telegram `/job` 75+ → v3
4. Add rsync script or CI step to keep resume-tt copy in sync
5. Optional: wire real Resume-Matcher OSS benchmark subprocess

## Gotchas
- `NODE_ENV=production` skips devDeps — run `npm install --include=dev` before `npm run build` in resume-brain
- resume-tt cannot use `file:../automation/...` with Turbopack — use in-repo `packages/resume-brain` copy
- toolfactory remains templates/posters only — no brain
