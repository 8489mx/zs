#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_PATH="${1:-$ROOT_DIR/zs-main-release-clean.zip}"
STAGE_DIR="$(mktemp -d)"
TARGET_DIR="$STAGE_DIR/zs-main"

cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

mkdir -p "$TARGET_DIR"
rsync -a \
  --exclude '.git/' \
  --exclude 'backend/node_modules/' \
  --exclude 'frontend/node_modules/' \
  --exclude 'backend/dist/' \
  --exclude 'frontend/dist/' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'zs-main-release-clean.zip' \
  "$ROOT_DIR/" "$TARGET_DIR/"

cd "$STAGE_DIR"
zip -qr "$OUTPUT_PATH" zs-main

echo "[OK] wrote $OUTPUT_PATH"
