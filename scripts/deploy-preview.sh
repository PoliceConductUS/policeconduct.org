#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env-policeconduct ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${PR_NUMBER:?PR_NUMBER is required (example: PR_NUMBER=123)}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${CLOUDFRONT_DIST_PREVIEW:?CLOUDFRONT_DIST_PREVIEW is required (preview distribution)}"

SITE_URL="https://pr-${PR_NUMBER}.preview.policeconduct.org"
export SITE_URL
npm run build

# Upload + invalidate (also writes the deny-all robots.txt). Factored into a
# standalone, retrying, resumable step so a
# dropped S3 connection can be resumed with `npm run deploy:preview:sync`
# WITHOUT rebuilding.
bash scripts/deploy-preview-sync.sh

echo "Preview deploy complete: ${SITE_URL}"
