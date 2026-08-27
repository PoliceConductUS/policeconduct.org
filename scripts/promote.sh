#!/usr/bin/env bash
#
# Promote an immutable build (builds/<sha>/) to production by flipping the
# CloudFront KeyValueStore `current` pointer. No CloudFront invalidation is
# needed — the router function folds <id> into the cache key, so the flip serves
# the new build immediately and builds coexist in cache. Rollback = promote a
# previously promoted sha.
#
# This build's per-build redirects (builds/<sha>/redirects.json, shape
# [{ "from": "/old/", "to": "/new/" }, ...]) are loaded into the KVS under the
# build's namespace (r:<sha>:<from> = <to>) before the pointer flip, so redirects
# apply on the apex and every <id>.builds host.
#
# Requires: aws CLI, node, and env S3_BUCKET + KVS_ARN.
# Part of openspec/changes/atomic-sha-deploys (design.md §3).
set -euo pipefail

SHA="${1:?usage: promote.sh <sha>}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${KVS_ARN:?KVS_ARN is required}"

# 1) The build must exist.
if ! aws s3api head-object \
  --bucket "${S3_BUCKET}" \
  --key "builds/${SHA}/index.html" >/dev/null 2>&1; then
  echo "error: builds/${SHA}/index.html not found in s3://${S3_BUCKET}" >&2
  exit 1
fi

# 2) Load this build's redirects into the KVS namespace r:<sha>:<from>.
redirects_file="$(mktemp)"
trap 'rm -f "${redirects_file}" "${redirects_file}.puts"' EXIT
if ! aws s3 cp "s3://${S3_BUCKET}/builds/${SHA}/redirects.json" \
  "${redirects_file}" >/dev/null 2>&1; then
  echo "[]" >"${redirects_file}"
fi

# Emit newline-delimited "Key=...,Value=..." entries for update-keys.
node -e '
  const fs = require("fs");
  const sha = process.argv[1];
  let list = [];
  try { list = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); } catch (e) {}
  for (const r of list) {
    if (!r || !r.from || !r.to) continue;
    process.stdout.write("Key=r:" + sha + ":" + r.from + ",Value=" + r.to + "\n");
  }
' "${SHA}" "${redirects_file}" >"${redirects_file}.puts"

# Batch redirect puts in groups of 50 (KVS update-keys per-call limit). Each
# batch is one null-delimited record of space-separated "Key=..,Value=.." args.
if [ -s "${redirects_file}.puts" ]; then
  awk 'NR%50==1{if(b!="")printf "%s\0",b; b=$0; next}{b=b" "$0}
       END{if(b!="")printf "%s\0",b}' "${redirects_file}.puts" \
  | while IFS= read -r -d '' batch; do
      [ -z "${batch}" ] && continue
      etag="$(aws cloudfront-keyvaluestore describe-key-value-store \
        --kvs-arn "${KVS_ARN}" --query ETag --output text)"
      # shellcheck disable=SC2086
      aws cloudfront-keyvaluestore update-keys \
        --kvs-arn "${KVS_ARN}" --if-match "${etag}" --puts ${batch}
    done
fi

# 3) Flip the pointer.
etag="$(aws cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn "${KVS_ARN}" --query ETag --output text)"
aws cloudfront-keyvaluestore update-keys \
  --kvs-arn "${KVS_ARN}" --if-match "${etag}" \
  --puts "Key=current,Value=${SHA}"

echo "promoted ${SHA} (no invalidation required)"
