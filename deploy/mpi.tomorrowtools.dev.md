# Deploy: mpi.tomorrowtools.dev

## Live architecture

```
Internet → Cloudflare TLS → cloudflared tunnel (tomorrowtools)
  → 127.0.0.1:3050  Next.js (mpi-web.service)
```

## What was configured

| Piece | Detail |
|-------|--------|
| Tunnel | `tomorrowtools` (`601ef350-22ec-4dac-93ed-a391b62714ff`) |
| Config | `~/.cloudflared/tomorrowtools-config.yml` ingress `mpi.tomorrowtools.dev` |
| DNS | `cloudflared tunnel --config … route dns tomorrowtools mpi.tomorrowtools.dev` |
| App unit | `~/.config/systemd/user/mpi-web.service` (enabled) |
| Env | `/home/shaik/Desktop/interviewprep/.env.production` (mode 600, not in git) |
| Origin | `127.0.0.1:3050` loopback only |
| Google | Dedicated MPI OAuth client (`GOOGLE_CLIENT_ID` / `SECRET` in `.env.production`) |
| Drive | Per-user OAuth via `/api/drive/connect` (tokens in SQLite `user_drive_tokens`) |
| AI | OpenClaw on `127.0.0.1:18789` (`AI_RUNTIME=openclaw`) |

## Ops

```bash
# rebuild + restart
cd /home/shaik/Desktop/interviewprep
npm run build
systemctl --user restart mpi-web.service

# tunnel (after config edit)
systemctl --user restart cloudflared-tomorrowtools.service

# logs
journalctl --user -u mpi-web.service -f
journalctl --user -u cloudflared-tomorrowtools.service -f
```

## Google Cloud Console (MPI OAuth client)

Same **OAuth 2.0 Web client** needs:

1. **APIs enabled:** Google Drive API (+ standard Google Identity for sign-in)
2. **Authorized redirect URIs:**
   - `https://mpi.tomorrowtools.dev/api/auth/callback/google` ← Sign-In
   - `https://mpi.tomorrowtools.dev/api/drive/callback` ← per-user Drive connect
3. **Authorized JavaScript origins** (optional but useful): `https://mpi.tomorrowtools.dev`

Drive is **not** a shared API key. Each signed-in user clicks **Connect Google Drive** in the studio; MPI stores that user’s refresh token and lists/imports only their files.

Until Sign-In redirect works, use **email + password** (`AUTH_ADMIN_PASSWORD`).

## Auth / AI notes

- `AUTH_DEV_LOGIN=1` keeps email/password credentials provider enabled.
- `AUTH_ADMIN_PASSWORD` seeds a scrypt hash for the admin user on startup.
- OpenClaw token: `~/.openclaw/openclaw.json` → `gateway.auth.token` → `OPENCLAW_GATEWAY_TOKEN`.
- Cursor API key is optional; with `AI_RUNTIME=openclaw` it is unused.
- Allowlist managed in Profile after admin sign-in.
- Do not commit `.env.production`.
