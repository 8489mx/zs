#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql>" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Stopping app services before rollback..."
docker compose --env-file .env.offline -f docker-compose.offline.yml stop backend frontend gateway

echo "Restoring database from backup..."
bash ./scripts/offline/restore.sh "$BACKUP_FILE"

echo "Starting app services after rollback..."
docker compose --env-file .env.offline -f docker-compose.offline.yml up -d backend frontend gateway

echo "Rollback complete from: $BACKUP_FILE"
