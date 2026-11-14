#!/usr/bin/env bash
# Resume uploading a completed preview release.
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

: "${PR_NUMBER:?PR_NUMBER is required (example: PR_NUMBER=3)}"
: "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required (preview bucket)}"
: "${KVS_ARN_PREVIEW:?KVS_ARN_PREVIEW is required (preview redirect store)}"
: "${RELEASE_DATA_BUCKET_PREVIEW:?RELEASE_DATA_BUCKET_PREVIEW is required}"
[[ "${PR_NUMBER}" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid PR number" >&2; exit 1; }
npm run validate:redirects
cmp -s dist/robots.txt <(printf 'User-agent: *\nDisallow: /\n') || { echo 'Expected a completed deny-all preview build.' >&2; exit 1; }
bash scripts/upload-release.sh "pr-${PR_NUMBER}" "${S3_BUCKET_PREVIEW}" "${RELEASE_DATA_BUCKET_PREVIEW}" "${KVS_ARN_PREVIEW}"
echo "Published https://pr-${PR_NUMBER}.preview.policeconduct.org"
