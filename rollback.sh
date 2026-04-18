#!/usr/bin/env bash
set -euo pipefail

bucket_name="policeconduct-site-942370948729"
manifest_path="rollback.json"
is_dry_run="true"

print_usage() {
  cat <<'EOF'
Usage:
  rollback.sh --bucket BUCKET_NAME [--manifest FILE] [--apply]

Options:
  --bucket     S3 bucket name (required)
  --manifest   Path to JSON manifest file (default: rollback.json)
  --apply      Actually perform the rollback. Default is dry-run.
  --help       Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      bucket_name="${2:-}"
      shift 2
      ;;
    --manifest)
      manifest_path="${2:-}"
      shift 2
      ;;
    --apply)
      is_dry_run="false"
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$bucket_name" ]]; then
  echo "Error: --bucket is required." >&2
  exit 1
fi

if [[ ! -f "$manifest_path" ]]; then
  echo "Error: manifest file not found: $manifest_path" >&2
  exit 1
fi

jq -c '.[]' "$manifest_path" | while IFS= read -r manifest_row; do
  object_key="$(jq -r '.Key' <<< "$manifest_row")"
  current_version_id="$(jq -r '.VersionId' <<< "$manifest_row")"

  if [[ -z "$object_key" || -z "$current_version_id" || "$object_key" == "null" || "$current_version_id" == "null" ]]; then
    echo "Skipping invalid row: $manifest_row" >&2
    continue
  fi

  version_selection="$(
    aws s3api list-object-versions \
      --bucket "$bucket_name" \
      --prefix "$object_key" \
      --output json \
      --query "Versions[?Key==\`$object_key\`] | sort_by(@, &LastModified) | reverse(@)" \
      --no-cli-pager \
    | jq -r --arg current_version_id "$current_version_id" '
        map(.VersionId) as $version_ids
        | ($version_ids | index($current_version_id)) as $current_index
        | if $current_index == null then
            ["missing", ""]
          elif ($current_index + 1) >= ($version_ids | length) then
            ["oldest", ""]
          else
            ["ok", $version_ids[$current_index + 1]]
          end
        | @tsv
      '
  )"

  IFS=$'\t' read -r selection_status previous_version_id <<< "$version_selection"

  case "$selection_status" in
    ok)
      ;;
    missing)
      echo "Listed version not found, skipping: $object_key ($current_version_id)"
      continue
      ;;
    oldest)
      echo "Listed version is already the oldest, skipping: $object_key ($current_version_id)"
      continue
      ;;
    *)
      echo "Could not determine rollback target, skipping: $object_key ($current_version_id)" >&2
      continue
      ;;
  esac

  if [[ "$is_dry_run" == "true" ]]; then
    echo "DRY RUN: would roll back:"
    echo "  key:      $object_key"
    echo "  current:  $current_version_id"
    echo "  previous: $previous_version_id"
  else
    echo "Rolling back: $object_key"
    aws s3api copy-object \
      --bucket "$bucket_name" \
      --key "$object_key" \
      --copy-source "${bucket_name}/${object_key}?versionId=${previous_version_id}" \
      --no-cli-pager >/dev/null
  fi
done
