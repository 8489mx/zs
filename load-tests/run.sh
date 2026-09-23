#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-scenarios/stress-all.js}"

echo "======================================================="
echo "  Z-Systems Enterprise Load & Stress Testing (k6)"
echo "======================================================="

if command -v k6 &> /dev/null; then
    echo "[INFO] Running scenario ${SCENARIO} using local k6 CLI..."
    k6 run "${DIR}/${SCENARIO}"
    exit 0
fi

if command -v docker &> /dev/null; then
    echo "[INFO] Local k6 not found. Running scenario ${SCENARIO} via Docker container (grafana/k6)..."
    docker run --rm -i -v "${DIR}/..:/work" -w /work/load-tests --network=host grafana/k6 run "${SCENARIO}"
    exit 0
fi

echo "[ERROR] Neither 'k6' nor 'docker' were found on PATH."
echo "Please install k6 (e.g. apt install k6 or brew install k6) or run via Docker."
echo "See docs/LOAD_TESTING.md for details."
exit 1
