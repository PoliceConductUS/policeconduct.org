#!/usr/bin/env bash
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
  # This optional secret-bearing file is local-only and cannot be checked in
  # or resolved by ShellCheck in a clean checkout. The existence check guards it.
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${S3_BUCKET:?S3_BUCKET is required}"
: "${KVS_ARN:?KVS_ARN is required (production redirect store)}"
: "${RELEASE_DATA_BUCKET:?RELEASE_DATA_BUCKET is required}"

if [[ "$SKIP_BUILD" == false ]]; then
  PR_NUMBER="" npm run build
fi
npm run validate:redirects
args=()
if [[ "$DRY_RUN" == true ]]; then args+=(--dry-run); fi
bash scripts/upload-release.sh prod "${S3_BUCKET}" "${RELEASE_DATA_BUCKET}" "${KVS_ARN}" "${args[@]}"
