#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

cleanup() {
  docker compose down >/dev/null 2>&1 || true
}
trap cleanup EXIT

npm run qa

docker compose up -d postgres backend frontend
bash "$ROOT_DIR/scripts/wait-for-http.sh" http://127.0.0.1:3001/health/ready 120 2
bash "$ROOT_DIR/scripts/wait-for-http.sh" http://127.0.0.1:5173 120 2
curl -fsS http://127.0.0.1:3001/health >/dev/null
curl -fsS http://127.0.0.1:3001/health/ready >/dev/null
curl -fsS http://127.0.0.1:5173 >/dev/null
E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:3001}" \
E2E_USERNAME="${E2E_USERNAME:-owner}" \
E2E_PASSWORD="${E2E_PASSWORD:-OwnerBootstrap2026!}" \
npm --prefix backend run test:e2e
npm run package:clean "$ROOT_DIR/zs-main-sale-ready.zip"

echo "[OK] sale readiness certification passed"
