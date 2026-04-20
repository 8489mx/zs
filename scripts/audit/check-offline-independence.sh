#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] Offline independence check started..."

targets=(
  "backend/src"
  "frontend/src"
  "docker-compose.offline.yml"
  ".env.offline.example"
  "scripts/offline"
)

supabase_hits="$(rg -n -i 'supabase' "${targets[@]}" || true)"
remote_db_hits="$(rg -n 'DATABASE_HOST=.*(amazonaws|supabase|render|railway|neon|elephantsql)' .env.offline.example || true)"

if [[ -n "$supabase_hits" ]]; then
  echo "[audit] Found forbidden Supabase references in offline runtime paths:"
  echo "$supabase_hits"
  exit 1
fi

if [[ -n "$remote_db_hits" ]]; then
  echo "[audit] Found remote database host pattern in .env.offline.example:"
  echo "$remote_db_hits"
  exit 1
fi

echo "[audit] PASS: no Supabase/remote DB references detected in offline runtime paths."
