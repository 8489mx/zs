#!/usr/bin/env sh
set -eu
URL="${1:-http://127.0.0.1:3001/health}"
ATTEMPTS="${2:-60}"
SLEEP_SECS="${3:-2}"

count=0
while [ "$count" -lt "$ATTEMPTS" ]; do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "$URL" >/dev/null 2>&1; then
      echo "[ok] $URL"
      exit 0
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -qO- "$URL" >/dev/null 2>&1; then
      echo "[ok] $URL"
      exit 0
    fi
  else
    echo "curl or wget is required" >&2
    exit 2
  fi
  count=$((count + 1))
  sleep "$SLEEP_SECS"
done

echo "Timed out waiting for $URL" >&2
exit 1
