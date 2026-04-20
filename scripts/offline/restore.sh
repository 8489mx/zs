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

set -a
source .env.offline
set +a

docker compose --env-file .env.offline -f docker-compose.offline.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

docker compose --env-file .env.offline -f docker-compose.offline.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"

echo "Restore complete from: $BACKUP_FILE"
