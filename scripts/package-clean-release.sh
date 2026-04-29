#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_PATH="${1:-$ROOT_DIR/zs-main-release-clean.zip}"
STAGE_DIR="$(mktemp -d)"
TARGET_DIR="$STAGE_DIR/zs-main"
PORTABLE_TEMPLATE_PATH="$ROOT_DIR/portable/config/.env.offline.template"

cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

if grep -Eq '^ENABLE_BOOTSTRAP_ADMIN=true$' "$PORTABLE_TEMPLATE_PATH"; then
  echo "[ERROR] portable/config/.env.offline.template must keep ENABLE_BOOTSTRAP_ADMIN=false for customer releases" >&2
  exit 1
fi

if grep -Eq '^DEFAULT_ADMIN_USERNAME=.+$' "$PORTABLE_TEMPLATE_PATH"; then
  echo "[ERROR] portable/config/.env.offline.template must keep DEFAULT_ADMIN_USERNAME blank for customer releases" >&2
  exit 1
fi

if grep -Eq '^DEFAULT_ADMIN_PASSWORD=.+$' "$PORTABLE_TEMPLATE_PATH"; then
  echo "[ERROR] portable/config/.env.offline.template must keep DEFAULT_ADMIN_PASSWORD blank for customer releases" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
rsync -a \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'backend/node_modules/' \
  --exclude 'frontend/node_modules/' \
  --exclude 'backend/dist/' \
  --exclude 'frontend/dist/' \
  --exclude 'backend/.env' \
  --exclude 'frontend/.env' \
  --exclude 'backend/scripts/reset-zs-password.js' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'zs-main-release-clean.zip' \
  "$ROOT_DIR/" "$TARGET_DIR/"

if [ -f "$TARGET_DIR/backend/scripts/reset-zs-password.js" ]; then
  echo "[ERROR] clean release must not include backend/scripts/reset-zs-password.js" >&2
  exit 1
fi

cd "$STAGE_DIR"
zip -qr "$OUTPUT_PATH" zs-main

echo "[OK] wrote $OUTPUT_PATH"
