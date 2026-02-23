#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/bootstrap-policeconduct"
ENV_FILE_NAME="${ENV_FILE_NAME:-.env-policeconduct}"
ENV_FILE="${REPO_ROOT}/${ENV_FILE_NAME}"
RECAPTCHA_ENV_FILE="${REPO_ROOT}/.env-recaptcha"

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

read_env_key_from_file() {
  local file_path="$1"
  local key="$2"
  local value

  if [[ ! -f "${file_path}" ]]; then
    return 0
  fi

  value="$(
    awk -v key="${key}" '
      $0 ~ /^[[:space:]]*#/ { next }
      {
        line = $0
        sub(/^[[:space:]]+/, "", line)
        if (index(line, key "=") == 1) {
          val = substr(line, length(key) + 2)
        }
      }
      END { if (val != "") print val }
    ' "${file_path}"
  )"

  if [[ -z "${value}" ]]; then
    return 0
  fi

  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf "%s" "${value}"
}

to_env_key() {
  local raw="$1"
  local upper
  upper="$(printf "%s" "${raw}" | tr '[:lower:]' '[:upper:]')"
  printf "%s" "${upper}" | sed -E 's/[^A-Z0-9_]/_/g'
}

TF_STATE_BUCKET="$(tf_output state_bucket_name)"
S3_BUCKET="$(tf_output site_bucket_name)"
S3_BUCKET_PREVIEW="$(tf_output preview_bucket_name)"
CLOUDFRONT_DIST_ID="$(tf_output cloudfront_distribution_id)"
CLOUDFRONT_DIST_PREVIEW="$(tf_output preview_cloudfront_distribution_id)"
AWS_ROLE_ARN="$(tf_output aws_role_arn)"
DRAFTS_BUCKET="$(tf_output forms_drafts_bucket_name)"
SUBMISSIONS_BUCKET="$(tf_output forms_submissions_bucket_name)"
FORMS_DRAFTS_KMS_KEY_ARN="$(tf_output forms_drafts_kms_key_arn)"
FORMS_SUBMISSIONS_KMS_KEY_ARN="$(tf_output forms_submissions_kms_key_arn)"
RECAPTCHA_SITE_KEY="$(tf_output recaptcha_site_key)"
RECAPTCHA_PROJECT_ID="$(tf_output recaptcha_project_id)"
RECAPTCHA_SERVICE_ACCOUNT_EMAIL=""
RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME=""
RECAPTCHA_WIF_AUDIENCE=""
FORMS_API_PREVIEW_FUNCTION_URL="$(tf_output forms_api_preview_function_url)"
if [[ -z "${RECAPTCHA_SITE_KEY}" || "${RECAPTCHA_SITE_KEY}" == "null" ]]; then
  RECAPTCHA_SITE_KEY="$(read_env_key_from_file "${RECAPTCHA_ENV_FILE}" "RECAPTCHA_SITE_KEY")"
fi
if [[ -z "${RECAPTCHA_PROJECT_ID}" || "${RECAPTCHA_PROJECT_ID}" == "null" ]]; then
  RECAPTCHA_PROJECT_ID="$(read_env_key_from_file "${RECAPTCHA_ENV_FILE}" "RECAPTCHA_PROJECT_ID")"
fi
if [[ -z "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}" || "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}" == "null" ]]; then
  RECAPTCHA_SERVICE_ACCOUNT_EMAIL="$(read_env_key_from_file "${RECAPTCHA_ENV_FILE}" "RECAPTCHA_SERVICE_ACCOUNT_EMAIL")"
fi
if [[ -z "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}" || "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}" == "null" ]]; then
  RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME="$(read_env_key_from_file "${RECAPTCHA_ENV_FILE}" "RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME")"
fi
if [[ -z "${RECAPTCHA_WIF_AUDIENCE}" || "${RECAPTCHA_WIF_AUDIENCE}" == "null" ]]; then
  RECAPTCHA_WIF_AUDIENCE="$(read_env_key_from_file "${RECAPTCHA_ENV_FILE}" "RECAPTCHA_WIF_AUDIENCE")"
fi

missing_recaptcha=()
if [[ -z "${RECAPTCHA_PROJECT_ID}" || "${RECAPTCHA_PROJECT_ID}" == "null" ]]; then
  missing_recaptcha+=("RECAPTCHA_PROJECT_ID")
fi
if [[ -z "${RECAPTCHA_SITE_KEY}" || "${RECAPTCHA_SITE_KEY}" == "null" ]]; then
  missing_recaptcha+=("RECAPTCHA_SITE_KEY")
fi
if [[ -z "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}" || "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}" == "null" ]]; then
  missing_recaptcha+=("RECAPTCHA_SERVICE_ACCOUNT_EMAIL")
fi
if [[ -z "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}" || "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}" == "null" ]]; then
  missing_recaptcha+=("RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME")
fi
if [[ -z "${RECAPTCHA_WIF_AUDIENCE}" || "${RECAPTCHA_WIF_AUDIENCE}" == "null" ]]; then
  missing_recaptcha+=("RECAPTCHA_WIF_AUDIENCE")
fi

if [[ ${#missing_recaptcha[@]} -gt 0 ]]; then
  echo "Error: missing required reCAPTCHA env value(s) for ${ENV_FILE_NAME}:" >&2
  printf ' - %s\n' "${missing_recaptcha[@]}" >&2
  echo "Run bootstrap-recaptcha apply/sync first to populate ${RECAPTCHA_ENV_FILE}." >&2
  exit 1
fi

if [[ -n "${TF_STATE_BUCKET}" ]]; then
  upsert_key "TF_STATE_BUCKET" "${TF_STATE_BUCKET}"
fi
if [[ -n "${AWS_ROLE_ARN}" ]]; then
  upsert_key "AWS_ROLE_ARN" "${AWS_ROLE_ARN}"
fi

# Local convenience values for either environment.
if [[ -n "${S3_BUCKET}" ]]; then
  upsert_key "S3_BUCKET" "${S3_BUCKET}"
fi
if [[ -n "${S3_BUCKET_PREVIEW}" ]]; then
  upsert_key "S3_BUCKET_PREVIEW" "${S3_BUCKET_PREVIEW}"
fi
if [[ -n "${DRAFTS_BUCKET}" ]]; then
  upsert_key "DRAFTS_BUCKET" "${DRAFTS_BUCKET}"
fi
if [[ -n "${SUBMISSIONS_BUCKET}" ]]; then
  upsert_key "SUBMISSIONS_BUCKET" "${SUBMISSIONS_BUCKET}"
fi
if [[ -n "${FORMS_DRAFTS_KMS_KEY_ARN}" ]]; then
  upsert_key "DRAFTS_KMS_KEY_ID" "${FORMS_DRAFTS_KMS_KEY_ARN}"
fi
if [[ -n "${FORMS_SUBMISSIONS_KMS_KEY_ARN}" ]]; then
  upsert_key "SUBMISSIONS_KMS_KEY_ID" "${FORMS_SUBMISSIONS_KMS_KEY_ARN}"
fi
if [[ -n "${RECAPTCHA_SITE_KEY}" && "${RECAPTCHA_SITE_KEY}" != "null" ]]; then
  upsert_key "RECAPTCHA_SITE_KEY" "${RECAPTCHA_SITE_KEY}"
fi
if [[ -n "${RECAPTCHA_PROJECT_ID}" && "${RECAPTCHA_PROJECT_ID}" != "null" ]]; then
  upsert_key "RECAPTCHA_PROJECT_ID" "${RECAPTCHA_PROJECT_ID}"
fi
upsert_key "RECAPTCHA_SERVICE_ACCOUNT_EMAIL" "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}"
upsert_key "RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME" "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}"
upsert_key "RECAPTCHA_WIF_AUDIENCE" "${RECAPTCHA_WIF_AUDIENCE}"
if [[ -n "${FORMS_API_PREVIEW_FUNCTION_URL}" ]]; then
  upsert_key "FORMS_API_PROXY_TARGET" "${FORMS_API_PREVIEW_FUNCTION_URL}"
fi
if [[ -n "${CLOUDFRONT_DIST_ID}" ]]; then
  upsert_key "CLOUDFRONT_DIST_ID" "${CLOUDFRONT_DIST_ID}"
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
