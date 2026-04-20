#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "Error: sha256sum is required." >&2
  exit 1
fi

VERSION="${1:-$(date +%Y.%m.%d-%H%M)}"
OUTPUT_DIR="${ROOT_DIR}/release"
BUNDLE_DIR="${OUTPUT_DIR}/zs-offline-${VERSION}"
ARCHIVE_PATH="${OUTPUT_DIR}/zs-offline-${VERSION}.tar.gz"

rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

copy_item() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  cp -R "$src" "$dest"
}

copy_item "backend" "${BUNDLE_DIR}/backend"
copy_item "frontend" "${BUNDLE_DIR}/frontend"
copy_item "deploy" "${BUNDLE_DIR}/deploy"
copy_item "docker-compose.offline.yml" "${BUNDLE_DIR}/docker-compose.offline.yml"
copy_item ".env.offline.example" "${BUNDLE_DIR}/.env.offline.example"
copy_item "OFFLINE_DEPLOYMENT_RUNBOOK.md" "${BUNDLE_DIR}/OFFLINE_DEPLOYMENT_RUNBOOK.md"
copy_item "README.md" "${BUNDLE_DIR}/README.md"
copy_item "package.json" "${BUNDLE_DIR}/package.json"
copy_item "scripts/offline" "${BUNDLE_DIR}/scripts/offline"

find "$BUNDLE_DIR" -name node_modules -type d -prune -exec rm -rf {} +

cat > "${BUNDLE_DIR}/RELEASE_MANIFEST.json" <<EOF
{
  "name": "zs-offline",
  "version": "${VERSION}",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitCommit": "$(git rev-parse HEAD)",
  "bundleType": "offline-onprem"
}
EOF

(cd "$BUNDLE_DIR" && find . -type f ! -name "SHA256SUMS" -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)

mkdir -p "$OUTPUT_DIR"
tar -czf "$ARCHIVE_PATH" -C "$OUTPUT_DIR" "zs-offline-${VERSION}"

echo "Release bundle created:"
echo " - Directory: $BUNDLE_DIR"
echo " - Archive:   $ARCHIVE_PATH"
