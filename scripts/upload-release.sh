#!/usr/bin/env bash
# Called after verification, with the public and private buckets for this host.
set -euo pipefail
namespace="${1:?deployment target}"
bucket="${2:?site bucket}"
private_bucket="${3:?release data bucket}"
store="${4:?redirect store}"
release_id="$(cat .release/id)"
case "${release_id}" in
  ""|.|..|*/*|*\\*) echo "Expected a single deployment folder name." >&2; exit 1 ;;
esac
[[ "${release_id}" != *[[:cntrl:]]* ]] || exit 1
[[ -f .release/data/index.json && -f .release/data/dynamic.json && -f .release/data/alias.json && -f dist/index.html ]] || {
  echo "Incomplete release. Run npm run build first." >&2
  exit 1
}
node scripts/release-files.mjs --verify "${release_id}" "${namespace}"
prefix="${release_id}"
if [[ "${namespace}" == prod ]]; then
  : "${S3_BUCKET_PREVIEW:?S3_BUCKET_PREVIEW is required}"
  : "${RELEASE_DATA_BUCKET_PREVIEW:?RELEASE_DATA_BUCKET_PREVIEW is required}"
  : "${KVS_ARN_PREVIEW:?KVS_ARN_PREVIEW is required}"
  : "${CLOUDFRONT_DIST_PREVIEW:?CLOUDFRONT_DIST_PREVIEW is required}"
fi
if [[ "${5:-}" == "--dry-run" ]]; then
  echo "Would upload dist/ to s3://${bucket}/${prefix}/build/ and .release/data/ to s3://${private_bucket}/builds/${prefix}/data/ and select ${release_id}."
  exit 0
fi

export AWS_MAX_ATTEMPTS="${AWS_MAX_ATTEMPTS:-10}"
export AWS_RETRY_MODE="${AWS_RETRY_MODE:-adaptive}"
sync_files() {
  local attempt=1 code
  while true; do
    if aws s3 sync "$@" --no-overwrite --only-show-errors; then return 0; else code=$?; fi
    if [[ "${attempt}" -ge "${SYNC_MAX_ATTEMPTS:-5}" ]]; then return "${code}"; fi
    sleep 10
    attempt=$((attempt + 1))
  done
}
# The Astro server bundle is build input, not a public site asset.
metadata="build-commit=${GIT_COMMIT_SHA:-$(git rev-parse --short=12 HEAD)},build-dirty=${GIT_COMMIT_DIRTY:-$(if git diff --quiet HEAD -- && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then echo 0; else echo 1; fi)}"
sync_files dist/ "s3://${bucket}/${prefix}/build/" --exclude '.prerender/*' --cache-control no-cache --metadata "${metadata}"
sync_files .release/data/ "s3://${private_bucket}/builds/${prefix}/data/" --exclude dynamic.json
# The roster is also the completed-release marker. Upload last.
sync_files .release/data/ "s3://${private_bucket}/builds/${prefix}/data/" --exclude '*' --include dynamic.json
if [[ "${namespace}" == prod ]]; then
  CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_PREVIEW}" bash scripts/upload-release.sh main "${S3_BUCKET_PREVIEW}" "${RELEASE_DATA_BUCKET_PREVIEW}" "${KVS_ARN_PREVIEW}"
fi
S3_BUCKET="${bucket}" KVS_ARN="${store}" RELEASE_DATA_BUCKET="${private_bucket}" \
  bash scripts/promote.sh "${release_id}" "${namespace}"
