#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${PR_NUMBER:?PR_NUMBER is required (example: PR_NUMBER=123)}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${CLOUDFRONT_DIST_PREVIEW:?CLOUDFRONT_DIST_PREVIEW is required (preview distribution)}"

SITE_URL="https://pr-${PR_NUMBER}.preview.policeconduct.org" npm run build

aws s3 sync dist/ "s3://${S3_BUCKET_PREVIEW}/pr-${PR_NUMBER}/" --delete
aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DIST_PREVIEW}" --paths "/pr-${PR_NUMBER}/*"

echo "Preview deploy complete: ${SITE_URL}"
