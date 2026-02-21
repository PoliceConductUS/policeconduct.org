#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/bootstrap"
ENV_FILE="${REPO_ROOT}/.env"

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

  # If the exact key=value line already exists, leave the file untouched.
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

TF_STATE_BUCKET="$(tf_output state_bucket_name)"
S3_BUCKET_PROD="$(tf_output site_bucket_name)"
S3_BUCKET_PREVIEW="$(tf_output preview_bucket_name)"
CLOUDFRONT_DIST_PROD="$(tf_output cloudfront_distribution_id)"
CLOUDFRONT_DIST_PREVIEW="$(tf_output preview_cloudfront_distribution_id)"
AWS_ROLE_ARN="$(tf_output aws_role_arn)"
FORMS_DRAFTS_BUCKET_PROD="$(tf_output forms_drafts_bucket_name)"
FORMS_SUBMISSIONS_BUCKET_PROD="$(tf_output forms_submissions_bucket_name)"
FORMS_DRAFTS_BUCKET_PREVIEW="$(tf_output forms_drafts_preview_bucket_name)"
FORMS_SUBMISSIONS_BUCKET_PREVIEW="$(tf_output forms_submissions_preview_bucket_name)"

if [[ -n "${TF_STATE_BUCKET}" ]]; then
  upsert_key "TF_STATE_BUCKET" "${TF_STATE_BUCKET}"
fi
if [[ -n "${AWS_ROLE_ARN}" ]]; then
  upsert_key "AWS_ROLE_ARN" "${AWS_ROLE_ARN}"
fi

# Local convenience values for either environment.
if [[ -n "${S3_BUCKET_PROD}" ]]; then
  upsert_key "S3_BUCKET_PROD" "${S3_BUCKET_PROD}"
  upsert_key "S3_BUCKET" "${S3_BUCKET_PROD}"
fi
if [[ -n "${S3_BUCKET_PREVIEW}" ]]; then
  upsert_key "S3_BUCKET_PREVIEW" "${S3_BUCKET_PREVIEW}"
fi
if [[ -n "${FORMS_DRAFTS_BUCKET_PROD}" ]]; then
  upsert_key "FORMS_DRAFTS_BUCKET_PROD" "${FORMS_DRAFTS_BUCKET_PROD}"
fi
if [[ -n "${FORMS_SUBMISSIONS_BUCKET_PROD}" ]]; then
  upsert_key "FORMS_SUBMISSIONS_BUCKET_PROD" "${FORMS_SUBMISSIONS_BUCKET_PROD}"
fi
if [[ -n "${FORMS_DRAFTS_BUCKET_PREVIEW}" ]]; then
  upsert_key "FORMS_DRAFTS_BUCKET_PREVIEW" "${FORMS_DRAFTS_BUCKET_PREVIEW}"
fi
if [[ -n "${FORMS_SUBMISSIONS_BUCKET_PREVIEW}" ]]; then
  upsert_key "FORMS_SUBMISSIONS_BUCKET_PREVIEW" "${FORMS_SUBMISSIONS_BUCKET_PREVIEW}"
fi
if [[ -n "${CLOUDFRONT_DIST_PROD}" ]]; then
  upsert_key "CLOUDFRONT_DIST_PROD" "${CLOUDFRONT_DIST_PROD}"
  upsert_key "CLOUDFRONT_DIST_ID" "${CLOUDFRONT_DIST_PROD}"
fi
if [[ -n "${CLOUDFRONT_DIST_PREVIEW}" ]]; then
  upsert_key "CLOUDFRONT_DIST_PREVIEW" "${CLOUDFRONT_DIST_PREVIEW}"
fi
# Mirror all Terraform outputs into .env as TF_OUT_<OUTPUT_NAME>.
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
