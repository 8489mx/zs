#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="${1:-$ROOT_DIR/release/signoff}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/launch-readiness-report-$STAMP.md"

run_check() {
  local name="$1"
  shift
  if "$@" >/tmp/zs_check_output.txt 2>&1; then
    echo "- [PASS] $name" >> "$OUT_FILE"
  else
    echo "- [FAIL] $name" >> "$OUT_FILE"
    echo "" >> "$OUT_FILE"
    echo "  output:" >> "$OUT_FILE"
    sed 's/^/    /' /tmp/zs_check_output.txt >> "$OUT_FILE"
  fi
}

{
  echo "# Launch Readiness Report"
  echo ""
  echo "- Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Git commit: $(git rev-parse HEAD)"
  echo "- TENANT_ID: ${TENANT_ID:-not-set}"
  echo "- ACCOUNT_ID: ${ACCOUNT_ID:-not-set}"
  echo ""
  echo "## Automated checks"
} > "$OUT_FILE"

run_check "Backend typecheck" npm --prefix backend run typecheck
run_check "Backend critical tests" npm --prefix backend run test:critical
run_check "Offline independence audit" npm run audit:offline-independence
run_check "Mode coupling audit" npm run audit:mode-coupling
run_check "DB parity audit" npm run audit:db-parity
run_check "Data-access seam audit" npm run audit:data-access-seams
run_check "Cloud readiness audit" npm run audit:cloud-readiness
run_check "Migration parity audit" npm run audit:migration-parity

if command -v docker >/dev/null 2>&1; then
  run_check "Offline compose config" npm run compose:offline:config
else
  echo "- [SKIP] Offline compose config (docker not installed in this environment)." >> "$OUT_FILE"
fi

{
  echo ""
  echo "## Manual evidence required"
  echo "- Fill and attach: OFFLINE_OPERATIONAL_DRY_RUN_SIGNOFF.md"
  echo "- Fill and attach: OFFLINE_SUPABASE_INDEPENDENCE_CHECKLIST.md"
  echo "- Execute and attach: OFFLINE_ONLINE_SMOKE_CHECKLIST.md results"
} >> "$OUT_FILE"

echo "Launch readiness report written to: $OUT_FILE"
