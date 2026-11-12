#!/usr/bin/env bash
# Daily encrypted backup (age, public key only) with 30-day expiry. Run from systemd user timer.
set -euo pipefail
APP=resume-tt
APP_DIR=/home/shaik/Desktop/projects/resume-tt
ENV_FILE="$APP_DIR/.env.production"
DBS=("$APP_DIR/data/resume-tt.sqlite" "/home/shaik/Desktop/tomorrowtools-shared/allowlist.sqlite" "$APP_DIR/data/interviewprep.sqlite")
OUT_DIR="${BACKUP_DIR:-/home/shaik/backups/$APP-db}"
PUBKEY_FILE=/run/media/shaik/SALAHTIME_KEY/secrets-backup/ARCHIVE-PUBLIC-KEY.txt
[ -s "$PUBKEY_FILE" ] || PUBKEY_FILE=/home/shaik/.config/age-backup-public.txt
KEEP_DAYS=30
NODE=/home/shaik/.nvm/versions/node/v24.18.0/bin/node
export PATH=/home/shaik/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin
mkdir -p "$OUT_DIR"; chmod 700 "$OUT_DIR"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
STAMP=$(date +%Y%m%dT%H%M%S)
cd "$APP_DIR"
for db in "${DBS[@]}"; do
  [ -f "$db" ] && "$NODE" "$APP_DIR/deploy/backup/snapshot.mjs" "$ENV_FILE" "$db" "$TMP/$(basename "$db")"
done
tar -C "$TMP" -cf - . | age -R "$PUBKEY_FILE" -o "$OUT_DIR/$APP-$STAMP.tar.age"
chmod 600 "$OUT_DIR/$APP-$STAMP.tar.age"
find "$OUT_DIR" -name "$APP-*.tar.age" -mtime +$KEEP_DAYS -delete
# optional second copy on the pendrive when mounted
if [ -d /run/media/shaik/SALAHTIME_KEY/secrets-backup ] && [ -w /run/media/shaik/SALAHTIME_KEY/secrets-backup ]; then
  mkdir -p "/run/media/shaik/SALAHTIME_KEY/secrets-backup/db/$APP" && cp "$OUT_DIR/$APP-$STAMP.tar.age" "/run/media/shaik/SALAHTIME_KEY/secrets-backup/db/$APP/" || true
fi
echo "backup ok: $OUT_DIR/$APP-$STAMP.tar.age"
