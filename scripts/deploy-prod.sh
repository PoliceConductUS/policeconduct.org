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

: "${S3_BUCKET:?S3_BUCKET is required (production bucket)}"
: "${CLOUDFRONT_DIST_ID:?CLOUDFRONT_DIST_ID is required (production distribution)}"

npm run build
aws s3 sync dist/ "s3://${S3_BUCKET}" --delete
aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DIST_ID}" --paths "/*"

echo "Production deploy complete."
