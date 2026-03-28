#!/usr/bin/env bash
# delete-noncurrent-s3-versions.sh — delete all noncurrent object versions
# and noncurrent delete markers from a versioned S3 bucket.
#
# Usage:
#   ./scripts/delete-noncurrent-s3-versions.sh
#   ./scripts/delete-noncurrent-s3-versions.sh --dry-run
#   ./scripts/delete-noncurrent-s3-versions.sh --execute
#   ./scripts/delete-noncurrent-s3-versions.sh --bucket other-bucket --execute
set -euo pipefail

DEFAULT_BUCKET="policeconduct-site-942370948729"
BUCKET="${DEFAULT_BUCKET}"
EXECUTE=false

usage() {
  cat <<'EOF'
Usage:
  ./scripts/delete-noncurrent-s3-versions.sh [--bucket <name>] [--dry-run|--execute]

Options:
  --bucket <name>  S3 bucket name. Defaults to policeconduct-site-942370948729.
  --dry-run        Show what would be deleted without deleting anything.
  --execute        Delete all noncurrent object versions and delete markers.
  --help           Show this help message.

Notes:
  - This script deletes every noncurrent version in the target bucket.
  - Current object versions are preserved.
  - Dry run is the default mode.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      BUCKET="${2:?--bucket requires a value}"
      shift 2
      ;;
    --dry-run)
      EXECUTE=false
      shift
      ;;
    --execute)
      EXECUTE=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required." >&2
  exit 1
fi

VERSIONS_JSON="$(mktemp)"
TARGETS_FILE="$(mktemp)"
BATCH_FILE="$(mktemp)"
trap 'rm -f "${VERSIONS_JSON}" "${TARGETS_FILE}" "${BATCH_FILE}"' EXIT

echo "▶ Listing noncurrent versions in s3://${BUCKET}..."
aws s3api list-object-versions \
  --bucket "${BUCKET}" \
  --output json > "${VERSIONS_JSON}"

jq -r '
  [
    (.Versions[]? | select(.IsLatest == false) | {Key, VersionId, Kind: "version"}),
    (.DeleteMarkers[]? | select(.IsLatest == false) | {Key, VersionId, Kind: "delete-marker"})
  ]
  | .[]
  | [.Key, .VersionId, .Kind]
  | @tsv
' "${VERSIONS_JSON}" > "${TARGETS_FILE}"

TOTAL_TARGETS="$(wc -l < "${TARGETS_FILE}" | tr -d ' ')"
VERSION_COUNT="$(awk -F '\t' '$3 == "version" {count++} END {print count + 0}' "${TARGETS_FILE}")"
DELETE_MARKER_COUNT="$(awk -F '\t' '$3 == "delete-marker" {count++} END {print count + 0}' "${TARGETS_FILE}")"

if [[ "${TOTAL_TARGETS}" == "0" ]]; then
  echo "✓ No noncurrent versions found in s3://${BUCKET}."
  exit 0
fi

echo "Found ${TOTAL_TARGETS} noncurrent entries:"
echo "  object versions: ${VERSION_COUNT}"
echo "  delete markers:  ${DELETE_MARKER_COUNT}"

echo ""
echo "Sample entries:"
head -n 10 "${TARGETS_FILE}" | awk -F '\t' '{printf "  [%s] %s (%s)\n", $3, $1, $2}'
if [[ "${TOTAL_TARGETS}" -gt 10 ]]; then
  echo "  ... and $(("${TOTAL_TARGETS}" - 10)) more"
fi

if [[ "${EXECUTE}" != "true" ]]; then
  echo ""
  echo "Dry run only. Re-run with --execute to delete these noncurrent versions."
  exit 0
fi

echo ""
echo "▶ Deleting noncurrent versions from s3://${BUCKET}..."

BATCH_SIZE=1000
DELETED_COUNT=0

while IFS= read -r start_index; do
  sed -n "${start_index},$((start_index + BATCH_SIZE - 1))p" "${TARGETS_FILE}" \
    | jq -R -s '
        split("\n")
        | map(select(length > 0))
        | map(split("\t"))
        | {
            Objects: map({Key: .[0], VersionId: .[1]}),
            Quiet: true
          }
      ' > "${BATCH_FILE}"

  BATCH_COUNT="$(jq '.Objects | length' "${BATCH_FILE}")"
  if [[ "${BATCH_COUNT}" == "0" ]]; then
    continue
  fi

  aws s3api delete-objects \
    --bucket "${BUCKET}" \
    --delete "file://${BATCH_FILE}" \
    --output json > /dev/null

  DELETED_COUNT=$((DELETED_COUNT + BATCH_COUNT))
  echo "  deleted ${DELETED_COUNT}/${TOTAL_TARGETS}"
done < <(seq 1 "${BATCH_SIZE}" "${TOTAL_TARGETS}")

echo "✓ Deleted ${DELETED_COUNT} noncurrent entries from s3://${BUCKET}."
