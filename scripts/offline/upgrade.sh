#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -f .env.offline ]]; then
  echo "Error: .env.offline is missing. Create it first (cp .env.offline.example .env.offline)." >&2
  exit 1
fi

set -a
source .env.offline
set +a

BACKUP_DIR="${1:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/pre-upgrade-$TIMESTAMP.sql"

echo "Step 1/4: starting database container..."
docker compose --env-file .env.offline -f docker-compose.offline.yml up -d postgres

echo "Step 2/4: creating pre-upgrade backup -> $BACKUP_FILE"
docker compose --env-file .env.offline -f docker-compose.offline.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"

echo "Step 3/4: rebuilding application images..."
docker compose --env-file .env.offline -f docker-compose.offline.yml build backend frontend

echo "Step 4/4: rolling forward services..."
docker compose --env-file .env.offline -f docker-compose.offline.yml up -d backend frontend gateway

echo "Upgrade complete."
echo "Pre-upgrade backup: $BACKUP_FILE"
