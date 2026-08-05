# Deploy: resume.tomorrowtools.dev

## Architecture

```
Internet → Cloudflare TLS → cloudflared tunnel (tomorrowtools)
  → 127.0.0.1:3060  Next.js (resume-tt-web.service)
```

## Install service

```bash
cd /home/shaik/Desktop/projects/resume-tt
npm install
npm run build
bash scripts/install-web.sh
```

## Ops

```bash
cd /home/shaik/Desktop/projects/resume-tt
npm run build
systemctl --user restart resume-tt-web.service
journalctl --user -u resume-tt-web.service -f
```

## Google OAuth (same client as MPI or dedicated)

Redirect URIs:

- `https://resume.tomorrowtools.dev/api/auth/callback/google`
- `https://resume.tomorrowtools.dev/api/drive/callback`

## Cross-links

- MPI → Resume: `NEXT_PUBLIC_RESUME_URL=https://resume.tomorrowtools.dev`
- Resume → MPI: `NEXT_PUBLIC_MPI_URL=https://mpi.tomorrowtools.dev`

Separate SQLite: `data/resume-tt.sqlite` (not shared with MPI).
