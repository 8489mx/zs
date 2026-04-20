#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TEMPLATE="$ROOT_DIR/OFFLINE_OPERATIONAL_DRY_RUN_SIGNOFF.md"
OUT_DIR="${1:-$ROOT_DIR/release/signoff}"
mkdir -p "$OUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/offline-dry-run-signoff-$STAMP.md"

cp "$TEMPLATE" "$OUT_FILE"
echo "Created signoff file: $OUT_FILE"
