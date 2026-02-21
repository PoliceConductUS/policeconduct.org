#!/usr/bin/env bash
set -euo pipefail

input="$(cat)"

get_json_value() {
  local key="$1"
  printf '%s' "$input" | sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"
}

normalize_none() {
  local value="${1:-}"
  if [[ "$value" == "None" ]]; then
    printf ''
  else
    printf '%s' "$value"
  fi
}

lookup_oac_id() {
  local name="$1"
  local result

  result="$(
    aws cloudfront list-origin-access-controls \
      --query "OriginAccessControlList.Items[?Name=='${name}'].Id | [0]" \
      --output text 2>/dev/null || true
  )"

  normalize_none "$result"
}

lookup_function_arn() {
  local name="$1"
  local result

  result="$(
    aws cloudfront describe-function \
      --name "$name" \
      --query "FunctionSummary.FunctionMetadata.FunctionARN" \
      --output text 2>/dev/null || true
  )"
  result="$(normalize_none "$result")"

  if [[ -z "$result" ]]; then
    result="$(
      aws cloudfront describe-function \
        --name "$name" \
        --stage LIVE \
        --query "FunctionSummary.FunctionMetadata.FunctionARN" \
        --output text 2>/dev/null || true
    )"
    result="$(normalize_none "$result")"
  fi

  printf '%s' "$result"
}

lookup_distribution_id_by_alias() {
  local alias="$1"
  local result

  result="$(
    aws cloudfront list-distributions \
      --query "DistributionList.Items[?Aliases.Quantity > \`0\` && contains(Aliases.Items, '${alias}')].Id | [0]" \
      --output text 2>/dev/null || true
  )"

  normalize_none "$result"
}

oac_name="$(get_json_value "oac_name")"
index_function_name="$(get_json_value "index_function_name")"
preview_function_name="$(get_json_value "preview_function_name")"
site_alias="$(get_json_value "site_alias")"
preview_alias="$(get_json_value "preview_alias")"

oac_id="$(lookup_oac_id "$oac_name")"
index_function_arn="$(lookup_function_arn "$index_function_name")"
preview_function_arn="$(lookup_function_arn "$preview_function_name")"
site_distribution_id="$(lookup_distribution_id_by_alias "$site_alias")"
preview_distribution_id="$(lookup_distribution_id_by_alias "$preview_alias")"

printf '{"oac_id":"%s","index_function_arn":"%s","preview_function_arn":"%s","site_distribution_id":"%s","preview_distribution_id":"%s"}\n' \
  "$oac_id" \
  "$index_function_arn" \
  "$preview_function_arn" \
  "$site_distribution_id" \
  "$preview_distribution_id"
