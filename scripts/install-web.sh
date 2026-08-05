#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/resume-tt-web.service"
NODE="$(command -v node)"
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
