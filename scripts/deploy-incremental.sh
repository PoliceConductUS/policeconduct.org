#!/usr/bin/env bash
# deploy-incremental.sh — Upload only content-changed files to S3, then
# invalidate only those CloudFront paths.
#
# Usage:
#   ./scripts/deploy-incremental.sh              # build + incremental deploy
#   ./scripts/deploy-incremental.sh --skip-build  # deploy existing dist/
#   ./scripts/deploy-incremental.sh --dry-run     # show what would change
#
# Requires: aws cli, md5sum/md5 (macOS), jq (optional, for nicer output)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SKIP_BUILD=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run)    DRY_RUN=true ;;
  esac
done

if [[ -f .env-policeconduct ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${S3_BUCKET:?S3_BUCKET is required}"
: "${CLOUDFRONT_DIST_ID:?CLOUDFRONT_DIST_ID is required}"

DIST_DIR="dist"
MANIFEST_DIR=".deploy-cache"
PREV_MANIFEST="${MANIFEST_DIR}/d"
CURR_MANIFEST="${MANIFEST_DIR}/manifest-curr.txt"

mkdir -p "${MANIFEST_DIR}"

# ── Step 1: Build ───────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  echo "▶ Building site..."
  npm run build
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: ${DIST_DIR}/ not found. Run a build first or remove --skip-build."
  exit 1
fi

# ── Step 2: Generate content manifest (path → md5) ─────────────────────────
echo "▶ Computing content hashes for ${DIST_DIR}/..."

# Use shasum (available on macOS and Linux), fall back to md5sum/md5
if command -v shasum &>/dev/null; then
  HASH_CMD="shasum"
elif command -v md5sum &>/dev/null; then
  HASH_CMD="md5sum"
elif command -v md5 &>/dev/null; then
  HASH_CMD="md5 -r"
else
  echo "ERROR: No hash command found (shasum, md5sum, or md5)."
  exit 1
fi

# Generate manifest: "hash  relative/path"
# Hash all files, excluding pre-compressed variants.
# HTML no longer contains per-build-varying content.
(cd "$DIST_DIR" && find . -type f \
  ! -name '*.gz' ! -name '*.br' \
  -print0 \
  | xargs -0 -P 8 $HASH_CMD \
  | sed 's|  \./|  |' \
  | sort -k2) > "$CURR_MANIFEST"

TOTAL_FILES=$(wc -l < "$CURR_MANIFEST" | tr -d ' ')
echo "   ${TOTAL_FILES} files in build output."

# ── Step 3: Diff against previous manifest ──────────────────────────────────
CHANGED_FILES=()
DELETED_FILES=()

if [[ -f "$PREV_MANIFEST" ]]; then
  # Files that are new or have different hashes
  while IFS= read -r file; do
    CHANGED_FILES+=("$file")
  done < <(comm -13 <(sort "$PREV_MANIFEST") <(sort "$CURR_MANIFEST") | awk '{print $2}')

  # Files that existed before but are gone now
  while IFS= read -r file; do
    DELETED_FILES+=("$file")
  done < <(comm -23 <(awk '{print $2}' "$PREV_MANIFEST" | sort) <(awk '{print $2}' "$CURR_MANIFEST" | sort))
else
  echo "   No previous manifest found — treating as full deploy."
  while IFS= read -r file; do
    CHANGED_FILES+=("$file")
  done < <(awk '{print $2}' "$CURR_MANIFEST")
fi

echo "   ${#CHANGED_FILES[@]} changed/new files."
echo "   ${#DELETED_FILES[@]} deleted files."

if [[ ${#CHANGED_FILES[@]} -eq 0 && ${#DELETED_FILES[@]} -eq 0 ]]; then
  echo "✓ Nothing changed. Skipping deploy."
  exit 0
fi

# ── Step 4: Upload changed files ────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "── DRY RUN: Would upload ${#CHANGED_FILES[@]} files ──"
  printf '  %s\n' "${CHANGED_FILES[@]:0:30}"
  [[ ${#CHANGED_FILES[@]} -gt 30 ]] && echo "  ... and $((${#CHANGED_FILES[@]} - 30)) more"
  if [[ ${#DELETED_FILES[@]} -gt 0 ]]; then
    echo ""
    echo "── DRY RUN: Would delete ${#DELETED_FILES[@]} files ──"
    printf '  %s\n' "${DELETED_FILES[@]:0:20}"
    [[ ${#DELETED_FILES[@]} -gt 20 ]] && echo "  ... and $((${#DELETED_FILES[@]} - 20)) more"
  fi
  echo ""
  echo "── DRY RUN: Would invalidate paths ──"
  # Show a sample of what would be invalidated
  for f in "${CHANGED_FILES[@]:0:20}"; do
    p="/${f}"
    p="${p%/index.html}/"
    echo "  $p"
  done
  [[ ${#CHANGED_FILES[@]} -gt 20 ]] && echo "  ... and more"
  exit 0
fi

echo "▶ Uploading ${#CHANGED_FILES[@]} changed files to s3://${S3_BUCKET}..."

# Build commit metadata — attached to every S3 object for audit trail
BUILD_COMMIT="${GIT_COMMIT_SHA:-$(git rev-parse --short=12 HEAD 2>/dev/null || echo unknown)}"
BUILD_DIRTY="${GIT_COMMIT_DIRTY:-$(if git diff --quiet HEAD -- 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then echo false; else echo true; fi)}"
UPLOAD_METADATA="build-commit=${BUILD_COMMIT},build-dirty=${BUILD_DIRTY}"

STAGE_DIR="$(mktemp -d "${MANIFEST_DIR}/upload-stage.XXXXXX")"
cleanup_stage_dir() {
  if [[ -n "${STAGE_DIR:-}" && -d "${STAGE_DIR}" ]]; then
    rm -rf "${STAGE_DIR}"
  fi
}
trap cleanup_stage_dir EXIT

echo "▶ Staging changed files..."
for f in "${CHANGED_FILES[@]}"; do
  mkdir -p "${STAGE_DIR}/$(dirname "$f")"
  cp "${DIST_DIR}/${f}" "${STAGE_DIR}/${f}"
done

aws s3 sync "${STAGE_DIR}/" "s3://${S3_BUCKET}/" \
  --metadata "${UPLOAD_METADATA}"

# ── Step 5: Delete removed files ────────────────────────────────────────────
if [[ ${#DELETED_FILES[@]} -gt 0 ]]; then
  echo "▶ Deleting ${#DELETED_FILES[@]} removed files from S3..."
  # Batch delete (S3 supports up to 1000 per request)
  printf '%s\n' "${DELETED_FILES[@]}" | while IFS= read -r f; do
    echo "s3://${S3_BUCKET}/${f}"
  done | xargs -P 8 -I {} aws s3 rm {} --only-show-errors
fi

# ── Step 6: Invalidate only changed CloudFront paths ────────────────────────
# Convert file paths to URL paths for invalidation
INVALIDATION_PATHS=()
declare -A SEEN_PATHS=()

for f in "${CHANGED_FILES[@]}" "${DELETED_FILES[@]}"; do
  # Convert dist file path to URL path
  p="/${f}"

  # index.html → directory path
  p="${p%/index.html}"
  [[ -z "$p" ]] && p="/"
  [[ "$p" != "/" && "$p" != *"."* ]] && p="${p}/"

  # Deduplicate
  if [[ -z "${SEEN_PATHS[$p]+x}" ]]; then
    SEEN_PATHS[$p]=1
    INVALIDATION_PATHS+=("$p")
  fi
done

INVALIDATION_COUNT=${#INVALIDATION_PATHS[@]}
echo "▶ Invalidating ${INVALIDATION_COUNT} CloudFront paths..."

# CloudFront supports up to 3000 paths per invalidation request,
# but charges per path after 1000/month. If too many changed, use wildcard.
if [[ $INVALIDATION_COUNT -gt 500 ]]; then
  echo "   Over 500 paths changed — using wildcard invalidation instead."
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DIST_ID}" \
    --paths "/*" > /dev/null
else
  # Batch into groups of 100 for the API
  for ((i = 0; i < INVALIDATION_COUNT; i += 100)); do
    BATCH=("${INVALIDATION_PATHS[@]:i:100}")
    aws cloudfront create-invalidation \
      --distribution-id "${CLOUDFRONT_DIST_ID}" \
      --paths "${BATCH[@]}" > /dev/null
  done
fi

# ── Step 7: Save manifest for next run ──────────────────────────────────────
cp "$CURR_MANIFEST" "$PREV_MANIFEST"

echo ""
echo "✓ Incremental deploy complete."
echo "  Uploaded: ${#CHANGED_FILES[@]} files"
echo "  Deleted:  ${#DELETED_FILES[@]} files"
echo "  Invalidated: ${INVALIDATION_COUNT} paths"
