#!/usr/bin/env bash
# Resume uploading a completed preview release.
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
tf_env="$(node scripts/terraform-outputs.mjs S3_BUCKET_PREVIEW KVS_ARN_PREVIEW RELEASE_DATA_BUCKET_PREVIEW CLOUDFRONT_DIST_PREVIEW)"
eval "${tf_env}"

bash scripts/workspace-sync.sh preflight preview

target="${PREVIEW_NAME:-${PR_NUMBER:+pr-${PR_NUMBER}}}"
: "${target:?Set PR_NUMBER or PREVIEW_NAME for this preview host}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${KVS_ARN_PREVIEW:?KVS_ARN_PREVIEW is required (preview redirect store)}"
: "${RELEASE_DATA_BUCKET_PREVIEW:?RELEASE_DATA_BUCKET_PREVIEW is required}"
[[ "${target}" =~ ^[a-z0-9-]+$ ]] || { echo "Invalid preview host label" >&2; exit 1; }
npm run validate:redirects
cmp -s dist/robots.txt <(printf 'User-agent: *\nDisallow: /\n') || { echo 'Expected a completed deny-all preview build.' >&2; exit 1; }
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_PREVIEW:?}" bash scripts/upload-release.sh "${target}" "${S3_BUCKET_PREVIEW}" "${RELEASE_DATA_BUCKET_PREVIEW}" "${KVS_ARN_PREVIEW}"
bash scripts/workspace-sync.sh after preview
echo "Published https://${target}.preview.policeconduct.org"
