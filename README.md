# Resume Builder — resume.tomorrowtools.dev

ATS-friendly resume workflow extracted from MPI:

**Prepare → Analyze → Improve → Builder** (PDF templates)

Interview practice lives on [MPI](https://mpi.tomorrowtools.dev).

## Dev

```bash
npm install
npm run dev    # http://127.0.0.1:3060
```

## Production

```bash
npm run build
npm run start:prod   # 127.0.0.1:3060
```

See `deploy/resume.tomorrowtools.dev.md`.

## AI provider and recovery

The app calls one OpenAI-compatible endpoint. OpenClaw is the default local
choice, but an operator can set `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and
`AI_PROVIDER` to use another compatible gateway. Set `AI_ALLOW_REMOTE=true`
only for a trusted hosted endpoint.

Long requests are **journaled** with an idempotency key and can be polled at
`/api/recovery/jobs/:id`. Clients automatically poll HTTP 202 responses.
After a process restart, stale queued/running jobs are marked **`uncertain`**
(not auto-completed). This is duplicate-safe journaling + status, not a
guarantee that work finishes after the server dies mid-provider call.

SQLite stores recovery state and bounded memory snapshots; do not commit
production secrets or user data.

**Scores** shown in the studio are coaching heuristics / relative indicators
for revision — not validated predictions of ATS passage or hiring outcomes.

## Docker (self-host smoke)

```bash
cp .env.example .env
# set AUTH_SECRET and OPENCLAW_GATEWAY_TOKEN (or AI_API_KEY)
docker compose up --build
# app: http://127.0.0.1:3060  (OpenClaw on host: 18789)
```

## Env

Copy `.env.example` → `.env.local` (dev) or `.env.production` (prod).

- `NEXTAUTH_URL` / `AUTH_URL` — `https://resume.tomorrowtools.dev`
- Google OAuth redirect: `https://resume.tomorrowtools.dev/api/auth/callback/google`
- Drive callback: `https://resume.tomorrowtools.dev/api/drive/callback`
- `NEXT_PUBLIC_MPI_URL` — link back to interview studio

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing + sign-in |
| `/app` | Resume studio (prepare/analyze/improve/builder) |
| `/profile` | Saved resumes, settings |
| `/downloads/` | Android Manager / Resume / MPI APKs + `apps-manifest.json` |

## Android

Debug client in `android/` — current release **versionCode 10** (`1.0.6-busy-offline`).

See `android/README.md` and https://learn.tomorrowtools.dev/android-apps.html.
