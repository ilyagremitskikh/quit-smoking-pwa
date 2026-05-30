#!/usr/bin/env sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
BACKUP_DIR="${BACKUP_DIR:-/backup/quitkit}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB="${DATA_DIR}/quitkit.db"
OUT="${BACKUP_DIR}/${STAMP}"

mkdir -p "$OUT"

if [ ! -f "$DB" ]; then
  echo "No database found at $DB" >&2
  exit 1
fi

cp "$DB" "$OUT/quitkit.db"
[ -f "$DB-wal" ] && cp "$DB-wal" "$OUT/quitkit.db-wal"
[ -f "$DB-shm" ] && cp "$DB-shm" "$OUT/quitkit.db-shm"

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r | awk "NR>${KEEP}" | xargs -r rm -rf

echo "Backup written to $OUT"
