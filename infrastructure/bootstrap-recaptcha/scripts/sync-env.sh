#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/bootstrap-recaptcha"
ENV_FILE_NAME="${ENV_FILE_NAME:-.env-recaptcha}"
ENV_FILE="${REPO_ROOT}/${ENV_FILE_NAME}"

touch "${ENV_FILE}"

tf_output() {
  local name="$1"
  terraform -chdir="${TF_DIR}" output -raw "${name}" 2>/dev/null || true
}

env_quote() {
  local value="$1"
  local escaped
  escaped="$(printf "%s" "${value}" | sed "s/'/'\\''/g")"
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

PROJECT_ID="$(tf_output recaptcha_enterprise_project_id)"
SITE_KEY="$(tf_output recaptcha_enterprise_site_key)"
SECRET_ARN="$(tf_output recaptcha_service_account_secret_arn)"

if [[ -n "${PROJECT_ID}" ]]; then
  upsert_key "RECAPTCHA_ENTERPRISE_PROJECT_ID" "${PROJECT_ID}"
  upsert_key "TF_VAR_recaptcha_enterprise_project_id" "${PROJECT_ID}"
fi
if [[ -n "${SITE_KEY}" ]]; then
  upsert_key "PUBLIC_RECAPTCHA_SITE_KEY" "${SITE_KEY}"
  upsert_key "TF_VAR_public_recaptcha_site_key" "${SITE_KEY}"
fi
if [[ -n "${SECRET_ARN}" ]]; then
  upsert_key "RECAPTCHA_SERVICE_ACCOUNT_SECRET_ARN" "${SECRET_ARN}"
  upsert_key "TF_VAR_recaptcha_service_account_secret_arn" "${SECRET_ARN}"
fi

echo "Updated ${ENV_FILE} from Terraform outputs."
