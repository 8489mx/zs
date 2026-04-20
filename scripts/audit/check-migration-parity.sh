#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] Migration parity audit started..."

files=("docker-compose.offline.yml" "docker-compose.prod.yml" "docker-compose.saas.yml")
for f in "${files[@]}"; do
  [[ -f "$f" ]] || { echo "[audit] FAIL: missing $f"; exit 1; }
done

extract_backend_command() {
  local f="$1"
  awk '
    /backend:/ {in_backend=1}
    in_backend && /command:/ {sub(/^[[:space:]]*command:[[:space:]]*/, ""); print; exit}
    in_backend && /^[^[:space:]]/ && $1 !~ /backend:/ {exit}
  ' "$f"
}

expected='sh -c "npm run migration:run && npm start"'
for f in "${files[@]}"; do
  cmd="$(extract_backend_command "$f")"
  if [[ "$cmd" != "$expected" ]]; then
    echo "[audit] FAIL: backend command mismatch in $f"
    echo "  expected: $expected"
    echo "  actual:   $cmd"
    exit 1
  fi
done

for src in backend/src/database/database.module.ts backend/src/database/migrate.ts backend/src/database/legacy-migration/db.ts; do
  if ! rg -n 'resolvePgSslConfig' "$src" >/dev/null; then
    echo "[audit] FAIL: $src must use resolvePgSslConfig for SSL parity."
    exit 1
  fi
done

echo "[audit] PASS: migration startup and SSL parity checks passed across offline/prod/saas paths."
