#!/usr/bin/env bash
# Sync an already-built dist/ to the preview bucket and invalidate CloudFront.
# NO build — safe to re-run on its own to resume a sync that dropped mid-upload
# (aws s3 sync is idempotent: it only uploads files that are missing or changed).
#
#   PR_NUMBER=3 bash scripts/deploy-preview-sync.sh
#   # or: PR_NUMBER=3 npm run deploy:preview:sync
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f .env-policeconduct ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env-policeconduct
  set +a
fi

: "${PR_NUMBER:?PR_NUMBER is required (example: PR_NUMBER=3)}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${CLOUDFRONT_DIST_PREVIEW:?CLOUDFRONT_DIST_PREVIEW is required (preview distribution)}"

if [[ ! -d dist ]]; then
  echo "dist/ not found — run 'npm run build' (or 'npm run deploy:preview') first." >&2
  exit 1
fi

# Make the AWS CLI itself resilient to transient network errors before we even
# fall back to the outer retry loop.
export AWS_MAX_ATTEMPTS="${AWS_MAX_ATTEMPTS:-10}"
export AWS_RETRY_MODE="${AWS_RETRY_MODE:-adaptive}"

# s3 sync is resumable, so on a hard connection drop just run it again — it picks
# up where it left off. Retry the whole sync a few times before giving up.
attempt=1
max_attempts="${SYNC_MAX_ATTEMPTS:-5}"
until aws s3 sync dist/ "s3://${S3_BUCKET_PREVIEW}/pr-${PR_NUMBER}/" --delete --only-show-errors; do
  code=$?
  if [[ "${attempt}" -ge "${max_attempts}" ]]; then
    echo "s3 sync failed after ${max_attempts} attempts (exit ${code})." >&2
    exit "${code}"
  fi
  echo "s3 sync interrupted (attempt ${attempt}/${max_attempts}); resuming in 10s..." >&2
  sleep 10
  attempt=$((attempt + 1))
done

aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DIST_PREVIEW}" \
  --paths "/pr-${PR_NUMBER}/*"

echo "Preview sync + invalidation complete: https://pr-${PR_NUMBER}.preview.policeconduct.org"
