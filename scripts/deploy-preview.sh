#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env-policeconduct ]]; then
  set -a
  # This optional secret-bearing file is local-only and cannot be checked in
  # or resolved by ShellCheck in a clean checkout. The existence check guards it.
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${PR_NUMBER:?PR_NUMBER is required (example: PR_NUMBER=123)}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${RELEASE_DATA_BUCKET_PREVIEW:?RELEASE_DATA_BUCKET_PREVIEW is required}"

SITE_URL="https://pr-${PR_NUMBER}.preview.policeconduct.org"
export SITE_URL
npm run build

bash scripts/deploy-preview-sync.sh

echo "Preview deploy complete: ${SITE_URL}"
