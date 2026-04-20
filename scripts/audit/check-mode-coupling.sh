#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] Mode-coupling audit started..."

# Business/domain paths must not read APP_MODE directly.
TARGETS=(
  "backend/src/modules"
  "backend/src/common"
)

hits="$(rg -n "APP_MODE|process\.env\.APP_MODE" "${TARGETS[@]}" || true)"

if [[ -n "$hits" ]]; then
  echo "[audit] FAIL: found deployment mode coupling inside business/domain paths:"
  echo "$hits"
  exit 1
fi

echo "[audit] PASS: no APP_MODE coupling detected in backend domain/business paths."
