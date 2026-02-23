#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DOTENV_FILE="${REPO_ROOT}/.env"
RECAPTCHA_DOTENV_FILE="${REPO_ROOT}/.env-recaptcha"
PHASE="${PHASE:-full}"

parse_github_repo_path() {
  local origin_url="$1"
  local repo_path=""
  case "${origin_url}" in
    git@github.com:*)
      repo_path="${origin_url#git@github.com:}"
      ;;
    https://github.com/*)
      repo_path="${origin_url#https://github.com/}"
      ;;
    ssh://git@github.com/*)
      repo_path="${origin_url#ssh://git@github.com/}"
      ;;
    git://github.com/*)
      repo_path="${origin_url#git://github.com/}"
      ;;
  esac
  repo_path="${repo_path%.git}"
  if [[ "${repo_path}" == */* ]]; then
    printf "%s\n" "${repo_path}"
  fi
  return 0
}

load_env_file_if_present() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]]; then
    return 0
  fi
  set -a
  # shellcheck disable=SC1090
  source "${file_path}"
  set +a
}

load_dotenv_if_present() {
  load_env_file_if_present "${DOTENV_FILE}"
  load_env_file_if_present "${RECAPTCHA_DOTENV_FILE}"
}

map_common_env_to_tf_vars() {
  # Support plain env names in .env and map them to Terraform inputs.
  if [[ -n "${SENTRY_AUTH_TOKEN+x}" ]] && [[ -z "${TF_VAR_sentry_auth_token+x}" ]]; then
    export TF_VAR_sentry_auth_token="${SENTRY_AUTH_TOKEN}"
  fi
  if [[ -n "${SENTRY_ORG+x}" ]] && [[ -z "${TF_VAR_sentry_org+x}" ]]; then
    export TF_VAR_sentry_org="${SENTRY_ORG}"
  fi
  if [[ -n "${SENTRY_PROJECT+x}" ]] && [[ -z "${TF_VAR_sentry_project+x}" ]]; then
    export TF_VAR_sentry_project="${SENTRY_PROJECT}"
  fi
  if [[ -n "${SENTRY_DSN_PRODUCTION+x}" ]] && [[ -z "${TF_VAR_sentry_dsn_production+x}" ]]; then
    export TF_VAR_sentry_dsn_production="${SENTRY_DSN_PRODUCTION}"
  fi
  if [[ -n "${SENTRY_DSN_PREVIEW+x}" ]] && [[ -z "${TF_VAR_sentry_dsn_preview+x}" ]]; then
    export TF_VAR_sentry_dsn_preview="${SENTRY_DSN_PREVIEW}"
  fi
  if [[ -n "${GA_MEASUREMENT_ID_PRODUCTION+x}" ]] && [[ -z "${TF_VAR_ga_measurement_id_production+x}" ]]; then
    export TF_VAR_ga_measurement_id_production="${GA_MEASUREMENT_ID_PRODUCTION}"
  fi
  if [[ -n "${GA_MEASUREMENT_ID_PREVIEW+x}" ]] && [[ -z "${TF_VAR_ga_measurement_id_preview+x}" ]]; then
    export TF_VAR_ga_measurement_id_preview="${GA_MEASUREMENT_ID_PREVIEW}"
  fi
  if [[ -n "${RECAPTCHA_SITE_KEY+x}" ]] && [[ -z "${TF_VAR_recaptcha_site_key+x}" ]]; then
    export TF_VAR_recaptcha_site_key="${RECAPTCHA_SITE_KEY}"
  fi
  if [[ -n "${RECAPTCHA_PROJECT_ID+x}" ]] && [[ -z "${TF_VAR_recaptcha_project_id+x}" ]]; then
    export TF_VAR_recaptcha_project_id="${RECAPTCHA_PROJECT_ID}"
  fi
  if [[ -n "${RECAPTCHA_SERVICE_ACCOUNT_EMAIL+x}" ]] && [[ -z "${TF_VAR_recaptcha_service_account_email+x}" ]]; then
    export TF_VAR_recaptcha_service_account_email="${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}"
  fi
  if [[ -n "${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME+x}" ]] && [[ -z "${TF_VAR_recaptcha_wif_provider_resource_name+x}" ]]; then
    export TF_VAR_recaptcha_wif_provider_resource_name="${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}"
  fi
  if [[ -n "${RECAPTCHA_WIF_AUDIENCE+x}" ]] && [[ -z "${TF_VAR_recaptcha_wif_audience+x}" ]]; then
    export TF_VAR_recaptcha_wif_audience="${RECAPTCHA_WIF_AUDIENCE}"
  fi
  if [[ -n "${RECAPTCHA_MIN_SCORE+x}" ]] && [[ -z "${TF_VAR_recaptcha_min_score+x}" ]]; then
    export TF_VAR_recaptcha_min_score="${RECAPTCHA_MIN_SCORE}"
  fi
}

preflight_recaptcha_requirements() {
  local source_hint=".env-recaptcha loaded by this script"
  local -a missing=()
  if [[ -z "${TF_VAR_recaptcha_project_id+x}" || -z "${TF_VAR_recaptcha_project_id}" ]]; then
    missing+=("TF_VAR_recaptcha_project_id (or RECAPTCHA_PROJECT_ID via ${source_hint})")
  fi
  if [[ -z "${TF_VAR_recaptcha_site_key+x}" || -z "${TF_VAR_recaptcha_site_key}" ]]; then
    missing+=("TF_VAR_recaptcha_site_key (or RECAPTCHA_SITE_KEY via ${source_hint})")
  fi
  if [[ -z "${TF_VAR_recaptcha_service_account_email+x}" || -z "${TF_VAR_recaptcha_service_account_email}" ]]; then
    missing+=("TF_VAR_recaptcha_service_account_email (or RECAPTCHA_SERVICE_ACCOUNT_EMAIL via ${source_hint})")
  fi
  if [[ -z "${TF_VAR_recaptcha_wif_provider_resource_name+x}" || -z "${TF_VAR_recaptcha_wif_provider_resource_name}" ]]; then
    missing+=("TF_VAR_recaptcha_wif_provider_resource_name (or RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME via ${source_hint})")
  fi
  if [[ -z "${TF_VAR_recaptcha_wif_audience+x}" || -z "${TF_VAR_recaptcha_wif_audience}" ]]; then
    missing+=("TF_VAR_recaptcha_wif_audience (or RECAPTCHA_WIF_AUDIENCE via ${source_hint})")
  fi
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Error: missing required reCAPTCHA terraform input(s):" >&2
    printf ' - %s\n' "${missing[@]}" >&2
    echo "Run infrastructure/bootstrap-recaptcha/scripts/apply.sh first." >&2
    exit 1
  fi
}

set_github_tf_vars_from_origin() {
  local origin_url repo_path github_org github_repo

  if [[ -n "${TF_VAR_github_org+x}" ]] && [[ -n "${TF_VAR_github_repo+x}" ]]; then
    return 0
  fi

  origin_url="$(git -C "${REPO_ROOT}" remote get-url origin 2>/dev/null || true)"
  if [[ -z "${origin_url}" ]]; then
    return 0
  fi

  repo_path="$(parse_github_repo_path "${origin_url}")"
  if [[ "${repo_path}" != */* ]]; then
    return 0
  fi

  github_org="${repo_path%%/*}"
  github_repo="${repo_path##*/}"

  if [[ -z "${TF_VAR_github_org+x}" ]]; then
    export TF_VAR_github_org="${github_org}"
  fi
  if [[ -z "${TF_VAR_github_repo+x}" ]]; then
    export TF_VAR_github_repo="${github_repo}"
  fi
}

preflight_explicit_tf_var_secrets() {
  # Prevent silently ignoring a common secret name that Terraform will not read.
  if [[ -n "${SENTRY_AUTH_TOKEN+x}" ]] \
    && [[ -z "${TF_VAR_sentry_auth_token+x}" ]]; then
    echo "Error: SENTRY_AUTH_TOKEN is set, but Terraform reads TF_VAR_sentry_auth_token." >&2
    echo "Set TF_VAR_sentry_auth_token before apply." >&2
    exit 1
  fi
}

preflight_sentry_upload_requirements() {
  # If upload is configured, fail before apply when required metadata is missing.
  local has_token=0
  local has_org=0
  local has_project=0
  if [[ -n "${TF_VAR_sentry_auth_token+x}" ]]; then
    has_token=1
  fi
  if [[ -n "${TF_VAR_sentry_org+x}" ]]; then
    has_org=1
  fi
  if [[ -n "${TF_VAR_sentry_project+x}" ]]; then
    has_project=1
  fi

  if [[ ${has_token} -eq 1 ]] && ([[ ${has_org} -eq 0 ]] || [[ ${has_project} -eq 0 ]]); then
    echo "Error: Sentry token is set, but sentry_org/sentry_project is missing." >&2
    echo "Set SENTRY_ORG and SENTRY_PROJECT (or TF_VAR_sentry_org / TF_VAR_sentry_project)." >&2
    exit 1
  fi
}

warn_if_sentry_tf_var_missing() {
  if [[ -z "${TF_VAR_sentry_auth_token+x}" ]]; then
    echo "Warning: TF_VAR_sentry_auth_token is not set." >&2
    echo "Warning: Bootstrap will not write GitHub environment secret SENTRY_AUTH_TOKEN." >&2
    echo "Warning: Deploy/preview workflows will fail at Sentry sourcemap upload." >&2
  fi
}

preflight_account_check() {
  if command -v aws >/dev/null 2>&1; then
    :
  else
    return 0
  fi
  if command -v jq >/dev/null 2>&1; then
    :
  else
    return 0
  fi

  local caller_account
  caller_account="$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || true)"
  if [[ -z "${caller_account}" || "${caller_account}" == "None" ]]; then
    return 0
  fi

  local state_accounts
  state_accounts="$(
    terraform -chdir="${ROOT_DIR}" state pull 2>/dev/null \
      | jq -r '..|.arn? // empty' \
      | grep -Eo 'arn:aws:[^:]+::[0-9]{12}' \
      | grep -Eo '[0-9]{12}' \
      | sort -u \
      | tr '\n' ' ' \
      | sed -E 's/[[:space:]]+$//' || true
  )"

  if [[ -z "${state_accounts}" ]]; then
    return 0
  fi

  if echo "${state_accounts}" | grep -Eq "(^| )${caller_account}( |$)"; then
    :
  else
    echo "Error: AWS account mismatch detected before terraform apply." >&2
    echo "Active caller account: ${caller_account}" >&2
    echo "Terraform state references account(s): ${state_accounts}" >&2
    echo >&2
    echo "Use credentials/profile for one of the state account IDs above," >&2
    echo "or intentionally migrate state before applying." >&2
    exit 1
  fi
}

prepare_forms_lambda_package() {
  local lambda_dir="${ROOT_DIR}/lambdas/forms-api"
  local package_json="${lambda_dir}/package.json"
  if [[ ! -f "${package_json}" ]]; then
    return 0
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required to prepare Lambda dependencies." >&2
    exit 1
  fi
  echo "Preparing forms-api Lambda dependencies..."
  npm --prefix "${lambda_dir}" install --omit=dev --no-audit --no-fund
}

run_foundation_apply() {
  local -a targets=(
    "aws_s3_bucket.terraform_state"
    "aws_s3_bucket_public_access_block.terraform_state"
    "aws_s3_bucket_ownership_controls.terraform_state"
    "aws_s3_bucket_versioning.terraform_state"
    "aws_s3_bucket_server_side_encryption_configuration.terraform_state"
    "aws_s3_bucket_policy.terraform_state_tls_only"
    "aws_s3_bucket.site"
    "aws_s3_bucket_public_access_block.site"
    "aws_s3_bucket_ownership_controls.site"
    "aws_s3_bucket_server_side_encryption_configuration.site"
    "aws_s3_bucket_versioning.site"
    "aws_s3_bucket.preview"
    "aws_s3_bucket_public_access_block.preview"
    "aws_s3_bucket_ownership_controls.preview"
    "aws_s3_bucket_versioning.preview"
    "aws_s3_bucket_server_side_encryption_configuration.preview"
    "aws_s3_bucket.forms_drafts"
    "aws_s3_bucket_public_access_block.forms_drafts"
    "aws_s3_bucket_ownership_controls.forms_drafts"
    "aws_s3_bucket_versioning.forms_drafts"
    "aws_s3_bucket_server_side_encryption_configuration.forms_drafts"
    "aws_s3_bucket_policy.forms_drafts"
    "aws_s3_bucket.forms_submissions"
    "aws_s3_bucket_public_access_block.forms_submissions"
    "aws_s3_bucket_ownership_controls.forms_submissions"
    "aws_s3_bucket_versioning.forms_submissions"
    "aws_s3_bucket_server_side_encryption_configuration.forms_submissions"
    "aws_s3_bucket_policy.forms_submissions"
    "aws_s3_bucket.forms_drafts_preview"
    "aws_s3_bucket_public_access_block.forms_drafts_preview"
    "aws_s3_bucket_ownership_controls.forms_drafts_preview"
    "aws_s3_bucket_versioning.forms_drafts_preview"
    "aws_s3_bucket_server_side_encryption_configuration.forms_drafts_preview"
    "aws_s3_bucket_policy.forms_drafts_preview"
    "aws_s3_bucket.forms_submissions_preview"
    "aws_s3_bucket_public_access_block.forms_submissions_preview"
    "aws_s3_bucket_ownership_controls.forms_submissions_preview"
    "aws_s3_bucket_versioning.forms_submissions_preview"
    "aws_s3_bucket_server_side_encryption_configuration.forms_submissions_preview"
    "aws_s3_bucket_policy.forms_submissions_preview"
    "aws_kms_key.forms_drafts"
    "aws_kms_alias.forms_drafts"
    "aws_kms_key.forms_submissions"
    "aws_kms_alias.forms_submissions"
    "aws_kms_key.forms_drafts_preview"
    "aws_kms_alias.forms_drafts_preview"
    "aws_kms_key.forms_submissions_preview"
    "aws_kms_alias.forms_submissions_preview"
    "aws_iam_role.forms_lambda"
    "aws_iam_role_policy.forms_lambda_permissions"
    "aws_lambda_function.forms_api_prod"
    "aws_lambda_function_url.forms_api_prod"
    "aws_lambda_permission.forms_api_function_url_prod"
    "aws_lambda_function.forms_api_preview"
    "aws_lambda_function_url.forms_api_preview"
    "aws_lambda_permission.forms_api_function_url_preview"
  )

  local -a cmd=("terraform" "-chdir=${ROOT_DIR}" "apply")
  local target
  for target in "${targets[@]}"; do
    cmd+=("-target=${target}")
  done
  if [[ $# -gt 0 ]]; then
    cmd+=("$@")
  fi

  "${cmd[@]}"
}

load_dotenv_if_present
map_common_env_to_tf_vars
preflight_recaptcha_requirements
set_github_tf_vars_from_origin
preflight_explicit_tf_var_secrets
preflight_sentry_upload_requirements
warn_if_sentry_tf_var_missing
preflight_account_check
prepare_forms_lambda_package
case "${PHASE}" in
  foundation)
    echo "Running bootstrap apply phase: foundation"
    run_foundation_apply "$@"
    ;;
  full)
    echo "Running bootstrap apply phase: full"
    terraform -chdir="${ROOT_DIR}" apply "$@"
    ;;
  *)
    echo "Error: PHASE must be either 'foundation' or 'full'." >&2
    exit 1
    ;;
esac
ENV_FILE_NAME="${ENV_FILE_NAME:-.env-policeconduct}" bash "${SCRIPT_DIR}/sync-env.sh"

echo "Bootstrap apply (${PHASE}) complete and .env synced."
