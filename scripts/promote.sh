#!/usr/bin/env bash
# Select a completed release (including a previously promoted release).
set -euo pipefail

release_id="${1:?usage: promote.sh <release-id> [pr-N]}"
namespace="${2:-prod}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${RELEASE_DATA_BUCKET:?RELEASE_DATA_BUCKET is required}"
: "${KVS_ARN:?KVS_ARN is required}"
: "${CLOUDFRONT_DIST_ID:?CLOUDFRONT_DIST_ID is required}"
[[ "${namespace}" == prod || "${namespace}" =~ ^[a-z0-9-]+$ ]] || {
  echo "Expected namespace prod or a label of lowercase letters, digits and hyphens." >&2
  exit 1
}
case "${release_id}" in
  ""|.|..|*/*|*\\*) echo "Expected a single deployment folder name." >&2; exit 1 ;;
esac
[[ "${release_id}" != *[[:cntrl:]]* ]] || {
  echo "Release ID must not contain control characters." >&2
  exit 1
}
prefix="${release_id}"
aws s3api head-object --bucket "${RELEASE_DATA_BUCKET}" --key "builds/${prefix}/data/dynamic.json" >/dev/null
aws s3api head-object --bucket "${S3_BUCKET}" --key "${prefix}/build/index.html" >/dev/null
redirects="$(mktemp)"
trap 'rm -f "${redirects}"' EXIT
aws s3 cp "s3://${S3_BUCKET}/${prefix}/build/_redirect-map.json" "${redirects}" --only-show-errors
node scripts/load-redirects.mjs "${KVS_ARN}" "r:${release_id}:" "${redirects}"

# CloudFront fetches its configured error document directly from the origin.
aws s3 cp "s3://${S3_BUCKET}/${prefix}/build/404.html" "s3://${S3_BUCKET}/404.html" --only-show-errors
pointer=current
if [[ "${namespace}" != prod ]]; then pointer="current:${namespace}"; fi
etag="$(aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "${KVS_ARN}" --query ETag --output text)"
aws cloudfront-keyvaluestore update-keys --kvs-arn "${KVS_ARN}" --if-match "${etag}" --puts "$(node -e 'console.log(JSON.stringify([{Key:process.argv[1],Value:process.argv[2]}]))' "${pointer}" "${release_id}")"
aws cloudfront create-invalidation --distribution-id "${CLOUDFRONT_DIST_ID}" --paths '/*' >/dev/null
echo "Selected ${release_id} for ${namespace}."
