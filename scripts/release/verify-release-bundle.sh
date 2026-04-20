#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_DIR="${1:-}"
if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: $0 <release-directory>" >&2
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Release directory not found: $TARGET_DIR" >&2
  exit 1
fi

if [[ ! -f "$TARGET_DIR/SHA256SUMS" ]]; then
  echo "Missing SHA256SUMS in $TARGET_DIR" >&2
  exit 1
fi

if [[ ! -f "$TARGET_DIR/RELEASE_MANIFEST.json" ]]; then
  echo "Missing RELEASE_MANIFEST.json in $TARGET_DIR" >&2
  exit 1
fi

(cd "$TARGET_DIR" && sha256sum -c SHA256SUMS)
echo "Release verification passed for $TARGET_DIR"
