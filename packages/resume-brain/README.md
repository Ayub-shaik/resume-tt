# @tomorrowtools/resume-brain

Unified resume scoring + JD-tailor brain for **resume-tt** and **job-search-ayub**.

## Canonical location

```
automation/packages/resume-brain/
```

`resume-tt/packages/resume-brain` is a **deploy copy** (Next.js/Turbopack cannot resolve cross-repo symlinks). Re-sync after brain changes:

```bash
rsync -a --delete automation/packages/resume-brain/ resume-tt/packages/resume-brain/ \
  --exclude node_modules
cd resume-tt/packages/resume-brain && npm run build
```

## API

- `scoreTriple(resume, jd?, role?)` → `{ ats, jd, overall, ... }`
- `runImprovePass(...)` → single v1–v4 pass with fact validation
- `runImproveChain(...)` → master → target version (e.g. v3 for 75+ match)
- `runImproveMore(...)` → advance one version
- `deliverVersionForMatch(score)` → `1` or `3`
- `selectModelTier(score)` → `premium` (≥65) | `standard`

## Build

```bash
npm install --include=dev   # NODE_ENV=production skips devDeps
npm run build
npm test
```

## Consumers

| App | Integration |
|-----|-------------|
| job-search-ayub | `src/brainAdapter.js` |
| resume-tt | `src/lib/brain/client.ts` + `/api/brain/improve` |
