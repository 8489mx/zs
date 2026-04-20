#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] Cloud readiness audit started..."

FILE="docker-compose.saas.yml"
[[ -f "$FILE" ]] || { echo "[audit] FAIL: missing $FILE"; exit 1; }

if rg -n '^\s*postgres:' "$FILE" >/dev/null; then
  echo "[audit] FAIL: $FILE should not define a local postgres service for CLOUD_SAAS mode."
  exit 1
fi

if ! rg -n 'APP_MODE:\s*\$\{APP_MODE:-CLOUD_SAAS\}' "$FILE" >/dev/null; then
  echo "[audit] FAIL: backend APP_MODE default is not CLOUD_SAAS in $FILE."
  exit 1
fi

if ! rg -n 'DATABASE_HOST:\s*\$\{DATABASE_HOST:\?DATABASE_HOST is required for CLOUD_SAAS\}' "$FILE" >/dev/null; then
  echo "[audit] FAIL: backend DATABASE_HOST is not required/hosted in $FILE."
  exit 1
fi

if ! rg -n '^APP_MODE=CLOUD_SAAS$' .env.saas.example >/dev/null; then
  echo "[audit] FAIL: .env.saas.example is missing APP_MODE=CLOUD_SAAS."
  exit 1
fi

if ! rg -n '^TENANT_ID=' .env.saas.example >/dev/null || ! rg -n '^ACCOUNT_ID=' .env.saas.example >/dev/null; then
  echo "[audit] FAIL: .env.saas.example is missing TENANT_ID/ACCOUNT_ID."
  exit 1
fi

if ! rg -n '^DATABASE_SSL=true$' .env.saas.example >/dev/null; then
  echo "[audit] FAIL: .env.saas.example must set DATABASE_SSL=true."
  exit 1
fi

if ! rg -n '^DATABASE_SSL_REJECT_UNAUTHORIZED=true$' .env.saas.example >/dev/null; then
  echo "[audit] FAIL: .env.saas.example must set DATABASE_SSL_REJECT_UNAUTHORIZED=true."
  exit 1
fi

if rg -n '^CORS_ORIGINS=.*(localhost|127\.0\.0\.1|\*)' .env.saas.example >/dev/null; then
  echo "[audit] FAIL: .env.saas.example CORS_ORIGINS contains insecure localhost/127.0.0.1/* values."
  exit 1
fi

echo "[audit] PASS: cloud readiness checks passed."
