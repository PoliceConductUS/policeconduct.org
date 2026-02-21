#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/bootstrap-iceconduct"
ENV_FILE_NAME="${ENV_FILE_NAME:-.env-iceconduct}"
ENV_FILE="${REPO_ROOT}/${ENV_FILE_NAME}"

touch "${ENV_FILE}"

tf_output() {
  local name="$1"
  terraform -chdir="${TF_DIR}" output -raw "${name}" 2>/dev/null || true
}

tf_output_json() {
  terraform -chdir="${TF_DIR}" output -json 2>/dev/null || echo "{}"
}

env_quote() {
  local value="$1"
  local escaped
  escaped="$(printf "%s" "${value}" | sed "s/'/'\\\\''/g")"
  printf "'%s'" "${escaped}"
}

upsert_key() {
  local key="$1"
  local value="$2"
  local tmp
  local rendered_line

  rendered_line="${key}=$(env_quote "${value}")"

  if grep -Fqx "${rendered_line}" "${ENV_FILE}"; then
    return 0
  fi

  tmp="$(mktemp)"
  awk -v key="${key}" '
    {
      if ($0 ~ "^[[:space:]]*" key "=") {
        print "# " $0
      } else {
        print $0
      }
    }
  ' "${ENV_FILE}" > "${tmp}"
  mv "${tmp}" "${ENV_FILE}"

  printf "%s\n" "${rendered_line}" >> "${ENV_FILE}"
}

to_env_key() {
  local raw="$1"
  local upper
  upper="$(printf "%s" "${raw}" | tr '[:lower:]' '[:upper:]')"
  printf "%s" "${upper}" | sed -E 's/[^A-Z0-9_]/_/g'
}

ROUTE53_ZONE_ID="$(tf_output route53_zone_id)"
CLOUDFRONT_DIST_ID="$(tf_output cloudfront_distribution_id)"
CLOUDFRONT_DOMAIN_NAME="$(tf_output cloudfront_domain_name)"
ACM_CERT_ARN="$(tf_output acm_certificate_arn)"

if [[ -n "${ROUTE53_ZONE_ID}" ]]; then
  upsert_key "ROUTE53_ZONE_ID" "${ROUTE53_ZONE_ID}"
fi
if [[ -n "${CLOUDFRONT_DIST_ID}" ]]; then
  upsert_key "CLOUDFRONT_DIST_ID" "${CLOUDFRONT_DIST_ID}"
fi
if [[ -n "${CLOUDFRONT_DOMAIN_NAME}" ]]; then
  upsert_key "CLOUDFRONT_DOMAIN_NAME" "${CLOUDFRONT_DOMAIN_NAME}"
fi
if [[ -n "${ACM_CERT_ARN}" ]]; then
  upsert_key "ACM_CERT_ARN" "${ACM_CERT_ARN}"
fi

outputs_json="$(tf_output_json)"
if ! command -v jq >/dev/null 2>&1; then
  echo "Warning: jq is not installed; skipping TF_OUT_* mirror keys." >&2
  echo "Updated ${ENV_FILE} from Terraform outputs."
  exit 0
fi

while IFS= read -r output_name; do
  [[ -z "${output_name}" ]] && continue
  output_env_key="TF_OUT_$(to_env_key "${output_name}")"
  output_value="$(
    printf "%s" "${outputs_json}" | jq -r --arg k "${output_name}" '
      (.[$k].value) as $v
      | if ($v | type) == "string" then
          $v
        elif ($v | type) == "number" or ($v | type) == "boolean" then
          ($v | tostring)
        else
          ($v | tojson)
        end
    '
  )"
  upsert_key "${output_env_key}" "${output_value}"
done < <(printf "%s" "${outputs_json}" | jq -r 'keys[]')

echo "Updated ${ENV_FILE} from Terraform outputs."
