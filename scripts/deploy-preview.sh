#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# Machine settings such as AWS_PROFILE come from the optional local .env.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
# Deployed resource names come from Terraform outputs, not from a local copy.
tf_env="$(node scripts/terraform-outputs.mjs S3_BUCKET_PREVIEW RELEASE_DATA_BUCKET_PREVIEW)"
eval "${tf_env}"

bash scripts/workspace-sync.sh preflight preview

export PREVIEW_NAME="${PREVIEW_NAME:-${PR_NUMBER:+pr-${PR_NUMBER}}}"
: "${PREVIEW_NAME:?Set PR_NUMBER or PREVIEW_NAME for this preview host}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${RELEASE_DATA_BUCKET_PREVIEW:?RELEASE_DATA_BUCKET_PREVIEW is required}"

SITE_URL="https://${PREVIEW_NAME}.preview.policeconduct.org"
export SITE_URL
npm run build

bash scripts/deploy-preview-sync.sh

echo "Preview deploy complete: ${SITE_URL}"
