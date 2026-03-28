#!/usr/bin/env bash
# seed-deploy-manifest.sh — Seed .deploy-cache/d from an existing deployed tree.
#
# Usage:
#   ./scripts/seed-deploy-manifest.sh /path/to/synced-site
#   ./scripts/seed-deploy-manifest.sh relative/path/to/synced-site
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  echo "Usage: bash scripts/seed-deploy-manifest.sh <site-root-path>"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

SOURCE_PATH="$1"

if [[ ! -d "${SOURCE_PATH}" ]]; then
  echo "ERROR: source directory not found: ${SOURCE_PATH}"
  exit 1
fi

if command -v realpath >/dev/null 2>&1; then
  SOURCE_DIR="$(realpath "${SOURCE_PATH}")"
else
  SOURCE_DIR="$(cd "${SOURCE_PATH}" && pwd)"
fi

MANIFEST_DIR=".deploy-cache"
MANIFEST_PATH="${MANIFEST_DIR}/d"

mkdir -p "${MANIFEST_DIR}"

if command -v shasum >/dev/null 2>&1; then
  HASH_CMD="shasum"
elif command -v md5sum >/dev/null 2>&1; then
  HASH_CMD="md5sum"
elif command -v md5 >/dev/null 2>&1; then
  HASH_CMD="md5 -r"
else
  echo "ERROR: No hash command found (shasum, md5sum, or md5)."
  exit 1
fi

echo "▶ Seeding ${MANIFEST_PATH} from ${SOURCE_DIR}..."

(
  cd "${SOURCE_DIR}" &&
  find . -type f ! -name '*.gz' ! -name '*.br' -print0 |
    xargs -0 -P 8 ${HASH_CMD} |
    sed 's|  \./|  |' |
    sort -k2
) > "${MANIFEST_PATH}"

TOTAL_FILES="$(wc -l < "${MANIFEST_PATH}" | tr -d ' ')"

echo "✓ Seeded ${MANIFEST_PATH}"
echo "  Source: ${SOURCE_DIR}"
echo "  Files:  ${TOTAL_FILES}"
