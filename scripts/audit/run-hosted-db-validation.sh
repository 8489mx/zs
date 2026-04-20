#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_PATH="${HOSTED_DB_VALIDATION_REPORT:-$ROOT_DIR/release/signoff/hosted-db-validation-$STAMP.md}"
mkdir -p "$(dirname "$REPORT_PATH")"

echo "[audit] Hosted DB CI-like validation started..."

: "${APP_MODE:=CLOUD_SAAS}"
: "${TENANT_ID:?TENANT_ID is required}"
: "${ACCOUNT_ID:?ACCOUNT_ID is required}"
database_url="${DATABASE_URL:-}"
db_connection_mode="split-vars"
if [[ -z "$database_url" ]]; then
  : "${DATABASE_HOST:?DATABASE_HOST is required when DATABASE_URL is unset}"
  : "${DATABASE_NAME:?DATABASE_NAME is required when DATABASE_URL is unset}"
  : "${DATABASE_USER:?DATABASE_USER is required when DATABASE_URL is unset}"
  : "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required when DATABASE_URL is unset}"

  if [[ "$DATABASE_HOST" == *"pooler.supabase.com"* ]]; then
    encoded_password="$(node -e "process.stdout.write(encodeURIComponent(process.argv[1] || ''))" "$DATABASE_PASSWORD")"
    database_url="postgresql://${DATABASE_USER}:${encoded_password}@${DATABASE_HOST}:${DATABASE_PORT:-5432}/${DATABASE_NAME}?sslmode=require"
    export DATABASE_URL="$database_url"
    db_connection_mode="database_url(pooler-derived)"
  fi
else
  db_connection_mode="database_url(explicit)"
fi

if [[ "$APP_MODE" != "CLOUD_SAAS" ]]; then
  echo "[audit] FAIL: APP_MODE must be CLOUD_SAAS (got: $APP_MODE)"
  exit 1
fi

if [[ -z "$database_url" ]]; then
  if [[ "$DATABASE_HOST" == "your-hosted-db-host" || "$DATABASE_PASSWORD" == "change-me-db-password" ]]; then
    echo "[audit] FAIL: hosted DB variables look like template placeholders."
    exit 1
  fi
fi

if [[ "$TENANT_ID" == "default" || "$ACCOUNT_ID" == "default" || "$TENANT_ID" == "replace-me-tenant-id" || "$ACCOUNT_ID" == "replace-me-account-id" ]]; then
  echo "[audit] FAIL: tenant/account placeholders are not allowed for hosted validation."
  exit 1
fi

if [[ "${DATABASE_SSL:-true}" != "true" || "${DATABASE_SSL_REJECT_UNAUTHORIZED:-true}" != "true" ]]; then
  echo "[audit] FAIL: DATABASE_SSL and DATABASE_SSL_REJECT_UNAUTHORIZED must both be true for hosted validation."
  exit 1
fi

if [[ "${CORS_ORIGINS:-}" =~ localhost|127\.0\.0\.1|\* ]]; then
  echo "[audit] FAIL: CORS_ORIGINS contains localhost/127.0.0.1/* and is not valid for hosted validation."
  exit 1
fi

run_check() {
  local name="$1"
  shift
  if "$@" >/tmp/zs_hosted_check_output.txt 2>&1; then
    echo "- [PASS] $name" >> "$REPORT_PATH"
  else
    echo "- [FAIL] $name" >> "$REPORT_PATH"
    echo "" >> "$REPORT_PATH"
    echo "  output:" >> "$REPORT_PATH"
    sed 's/^/    /' /tmp/zs_hosted_check_output.txt >> "$REPORT_PATH"
    return 1
  fi
}

{
  echo "# Hosted DB Validation Report"
  echo ""
  echo "- Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Git commit: $(git rev-parse HEAD)"
  echo "- APP_MODE: $APP_MODE"
  echo "- TENANT_ID: $TENANT_ID"
  echo "- ACCOUNT_ID: $ACCOUNT_ID"
  echo "- DB connection mode: $db_connection_mode"
  echo "- DB target: ${DATABASE_HOST:-DATABASE_URL}"
  echo ""
  echo "## Automated checks"
} > "$REPORT_PATH"

run_check "Cloud readiness audit" npm run audit:cloud-readiness
run_check "Migration parity audit" npm run audit:migration-parity
run_check "Data-access seam audit" npm run audit:data-access-seams
run_check "Backend typecheck" npm --prefix backend run typecheck

if [[ "${SKIP_DB_CONNECT:-false}" != "true" ]]; then
  run_check "Live hosted DB connection" npm --prefix backend run db:check-connection
else
  echo "- [SKIP] Live hosted DB connection (SKIP_DB_CONNECT=true)." >> "$REPORT_PATH"
fi

run_check "Backend critical tests" npm --prefix backend run test:critical

if command -v docker >/dev/null 2>&1; then
  run_check "SaaS compose config" npm run compose:saas:config
else
  echo "- [SKIP] SaaS compose config (docker not installed)." >> "$REPORT_PATH"
fi

echo "[audit] PASS: Hosted DB CI-like validation completed."
echo "[audit] Report written to: $REPORT_PATH"
