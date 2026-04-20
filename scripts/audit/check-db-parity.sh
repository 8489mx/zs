#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] DB parity audit started..."

offline_file="docker-compose.offline.yml"
prod_file="docker-compose.prod.yml"

for f in "$offline_file" "$prod_file"; do
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

extract_db_keys() {
  local f="$1"
  awk '
    /backend:/ {in_backend=1}
    in_backend && /environment:/ {in_env=1; next}
    in_env && /^[[:space:]]{6}(DATABASE_HOST|DATABASE_PORT|DATABASE_NAME|DATABASE_USER|DATABASE_PASSWORD|DATABASE_SCHEMA|DATABASE_SSL|DATABASE_SSL_REJECT_UNAUTHORIZED|DATABASE_SSL_CA_CERT):/ {
      gsub(/^[[:space:]]+/, "");
      split($0, arr, ":");
      print arr[1]
    }
    in_env && /^[[:space:]]{4}[a-zA-Z0-9_-]+:/ {in_env=0}
  ' "$f" | sort -u
}

offline_cmd="$(extract_backend_command "$offline_file")"
prod_cmd="$(extract_backend_command "$prod_file")"

if [[ "$offline_cmd" != "$prod_cmd" ]]; then
  echo "[audit] FAIL: backend startup command differs between offline/prod"
  echo "  offline: $offline_cmd"
  echo "  prod:    $prod_cmd"
  exit 1
fi

offline_keys="$(extract_db_keys "$offline_file")"
prod_keys="$(extract_db_keys "$prod_file")"

if [[ "$offline_keys" != "$prod_keys" ]]; then
  echo "[audit] FAIL: backend database env key-set differs between offline/prod"
  echo "--- offline keys ---"
  echo "$offline_keys"
  echo "--- prod keys ---"
  echo "$prod_keys"
  exit 1
fi

echo "[audit] PASS: offline/prod backend command and DB env key-set are parity-aligned."
