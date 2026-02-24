#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${S3_BUCKET:?S3_BUCKET is required (production bucket)}"
: "${CLOUDFRONT_DIST_ID:?CLOUDFRONT_DIST_ID is required (production distribution)}"

npm run build
aws s3 sync dist/ "s3://${S3_BUCKET}" --delete

if [[ -n "${CLOUDFRONT_INVALIDATION_PATHS:-}" ]]; then
  # shellcheck disable=SC2206
  INVALIDATION_PATHS=(${CLOUDFRONT_INVALIDATION_PATHS})
else
  INVALIDATION_PATHS=("/*")
fi

aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DIST_ID}" \
  --paths "${INVALIDATION_PATHS[@]}"

echo "Production deploy complete."
