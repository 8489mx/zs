#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -f .env.offline ]]; then
  cp .env.offline.example .env.offline
  echo "Created .env.offline from .env.offline.example"
fi

echo "Building and starting offline stack..."
docker compose --env-file .env.offline -f docker-compose.offline.yml up --build -d
echo "Offline install complete. Open: http://127.0.0.1:${APP_PUBLIC_PORT:-8080}"
