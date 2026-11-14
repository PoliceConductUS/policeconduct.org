#!/usr/bin/env bash
# Called after verification, with the public and private buckets for this host.
set -euo pipefail
namespace="${1:?release namespace}"
bucket="${2:?site bucket}"
private_bucket="${3:?release data bucket}"
store="${4:?redirect store}"
release_id="$(cat .release/id)"
if [[ ! "${release_id}" =~ ^${namespace}-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$ ]]; then
  echo "The built release does not belong to ${namespace}." >&2
  exit 1
fi
[[ -f .release/data/index.json && -f .release/data/dynamic.json && -f dist/index.html ]] || {
  echo "Incomplete release. Run npm run build first." >&2
  exit 1
}
node scripts/release-files.mjs --verify "${release_id}"
prefix="builds/${release_id}"
if [[ "${5:-}" == "--dry-run" ]]; then
  echo "Would upload dist/ to s3://${bucket}/${prefix}/static/ and .release/data/ to s3://${private_bucket}/${prefix}/data/ and select ${release_id}."
  exit 0
fi

export AWS_MAX_ATTEMPTS="${AWS_MAX_ATTEMPTS:-10}"
export AWS_RETRY_MODE="${AWS_RETRY_MODE:-adaptive}"
sync_files() {
  local attempt=1 code
  until aws s3 sync "$@" --no-overwrite --only-show-errors; do
    code=$?
    if [[ "${attempt}" -ge "${SYNC_MAX_ATTEMPTS:-5}" ]]; then return "${code}"; fi
    sleep 10
    attempt=$((attempt + 1))
  done
}
# The Astro server bundle is build input, not a public site asset.
metadata="build-commit=${GIT_COMMIT_SHA:-$(git rev-parse --short=12 HEAD)},build-dirty=${GIT_COMMIT_DIRTY:-$(if git diff --quiet HEAD -- && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then echo 0; else echo 1; fi)}"
sync_files dist/ "s3://${bucket}/${prefix}/static/" --exclude '.prerender/*' --cache-control no-cache --metadata "${metadata}"
sync_files .release/data/ "s3://${private_bucket}/${prefix}/data/" --exclude dynamic.json
# The roster is also the completed-release marker. Upload last.
sync_files .release/data/ "s3://${private_bucket}/${prefix}/data/" --exclude '*' --include dynamic.json
S3_BUCKET="${bucket}" KVS_ARN="${store}" RELEASE_DATA_BUCKET="${private_bucket}" \
  bash scripts/promote.sh "${release_id}" "${namespace}"
