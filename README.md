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
