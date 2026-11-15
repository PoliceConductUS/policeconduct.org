#!/usr/bin/env bash
# Select a completed release (including a previously promoted release).
set -euo pipefail

release_id="${1:?usage: promote.sh <release-id> [pr-N]}"
namespace="${2:-prod}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${RELEASE_DATA_BUCKET:?RELEASE_DATA_BUCKET is required}"
: "${KVS_ARN:?KVS_ARN is required}"
[[ "${namespace}" == prod || "${namespace}" =~ ^pr-[1-9][0-9]*$ ]] || exit 1
[[ "${release_id}" =~ ^${namespace}-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$ ]] || exit 1
prefix="builds/${release_id}"
aws s3api head-object --bucket "${RELEASE_DATA_BUCKET}" --key "${prefix}/data/dynamic.json" >/dev/null
aws s3api head-object --bucket "${S3_BUCKET}" --key "${prefix}/static/index.html" >/dev/null
redirects="$(mktemp)"
trap 'rm -f "${redirects}"' EXIT
aws s3 cp "s3://${S3_BUCKET}/${prefix}/static/_redirect-map.json" "${redirects}" --only-show-errors
node scripts/load-redirects.mjs "${KVS_ARN}" "r:${release_id}:" "${redirects}"

# CloudFront fetches its configured error document directly from the origin.
aws s3 cp "s3://${S3_BUCKET}/${prefix}/static/404.html" "s3://${S3_BUCKET}/404.html" --only-show-errors
pointer=current
if [[ "${namespace}" != prod ]]; then pointer="current:${namespace}"; fi
etag="$(aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "${KVS_ARN}" --query ETag --output text)"
aws cloudfront-keyvaluestore update-keys --kvs-arn "${KVS_ARN}" --if-match "${etag}" --puts "Key=${pointer},Value=${release_id}"
echo "Selected ${release_id} for ${namespace}."
