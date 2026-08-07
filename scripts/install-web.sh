#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/resume-tt-web.service"
# Prefer nvm node when present (avoid fragile cursor-agent bundled node)
if [[ -x "$HOME/.nvm/versions/node/v24.18.0/bin/node" ]]; then
  NODE="$HOME/.nvm/versions/node/v24.18.0/bin/node"
  NODE_BIN_DIR="$HOME/.nvm/versions/node/v24.18.0/bin"
else
  NODE="$(command -v node)"
  NODE_BIN_DIR="$(dirname "$NODE")"
fi
mkdir -p "$UNIT_DIR"
cat >"$UNIT" <<EOF
[Unit]
Description=resume-tt Next.js (resume.tomorrowtools.dev)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=HOME=$HOME
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3060
Environment=PATH=$NODE_BIN_DIR:/usr/bin:/bin
EnvironmentFile=-$ROOT/.env.production
ExecStart=$NODE $ROOT/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3060
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable resume-tt-web.service
systemctl --user restart resume-tt-web.service
echo "Installed $UNIT"
echo "Verify: curl -s https://resume.tomorrowtools.dev/api/auth/providers | head -c 400"
