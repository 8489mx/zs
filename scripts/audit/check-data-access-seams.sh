#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[audit] Data-access seam audit started..."

# R1 baseline: keep current direct Kysely imports from growing while we refactor to adapters.
MAX_DIRECT_KYSELY_IMPORTS="${MAX_DIRECT_KYSELY_IMPORTS:-0}"
TARGETS=("backend/src/modules" "backend/src/common")

hits="$(rg -n "from 'kysely'|from \"kysely\"" "${TARGETS[@]}" || true)"
count=0
if [[ -n "$hits" ]]; then
  count="$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
fi

echo "[audit] Direct Kysely imports in domain/application paths: $count"
echo "[audit] Budget (max): $MAX_DIRECT_KYSELY_IMPORTS"

if (( count > MAX_DIRECT_KYSELY_IMPORTS )); then
  echo "[audit] FAIL: direct data-access coupling grew beyond baseline budget."
  echo "$hits"
  exit 1
fi

if [[ -n "$hits" ]]; then
  echo "[audit] Top coupled files (for staged refactor):"
  printf '%s\n' "$hits" | cut -d: -f1 | sort | uniq -c | sort -nr | head -n 10
fi

echo "[audit] PASS: coupling budget respected (no regression)."
