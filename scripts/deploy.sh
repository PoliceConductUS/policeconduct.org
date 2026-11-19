#!/usr/bin/env bash
# Deploy the current commit to one environment: build it, upload the build to
# <environment site bucket>/<commit>/build/, and select it.
#
# Usage: deploy.sh <environment> [--skip-build] [--dry-run]
#   <environment>  prod, preview, or any other environment that has Terraform outputs.
#   --skip-build   Upload the completed build already in dist/ and .release/.
#   --dry-run      Show the upload destinations without uploading. It still builds
#                  unless --skip-build is also given.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  echo "Usage: deploy.sh <environment> [--skip-build] [--dry-run]" >&2
  exit 1
}

environment="${1:-}"
[[ "${environment}" =~ ^[a-z][a-z0-9-]*$ ]] || usage
shift
skip_build=false
dry_run=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) skip_build=true ;;
    --dry-run)    dry_run=true ;;
    *) echo "Unknown argument: ${arg}" >&2; usage ;;
  esac
done

# Machine settings such as AWS_PROFILE come from the optional local .env.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Deployed resource names come from Terraform outputs, not from a local copy.
# Production names have no suffix; every other environment's names end in its
# name, such as S3_BUCKET_PREVIEW.
if [[ "${environment}" == prod ]]; then
  site_var=S3_BUCKET data_var=RELEASE_DATA_BUCKET store_var=KVS_ARN dist_var=CLOUDFRONT_DIST_ID
  # A production release is also mirrored to the bare preview host.
  names=("${site_var}" "${data_var}" "${store_var}" "${dist_var}" S3_BUCKET_PREVIEW RELEASE_DATA_BUCKET_PREVIEW KVS_ARN_PREVIEW CLOUDFRONT_DIST_PREVIEW)
else
  suffix="$(printf '%s' "${environment}" | tr 'a-z-' 'A-Z_')"
  site_var="S3_BUCKET_${suffix}" data_var="RELEASE_DATA_BUCKET_${suffix}" store_var="KVS_ARN_${suffix}" dist_var="CLOUDFRONT_DIST_${suffix}"
  names=("${site_var}" "${data_var}" "${store_var}" "${dist_var}")
fi
tf_env="$(node scripts/terraform-outputs.mjs "${names[@]}")"
eval "${tf_env}"
bucket="${!site_var:?${site_var} is required}"
data_bucket="${!data_var:?${data_var} is required}"
store="${!store_var:?${store_var} is required}"
distribution="${!dist_var:?${dist_var} is required}"

# Production is selected as the live site. Any other environment serves the
# build at https://<label>.<environment>.policeconduct.org.
if [[ "${environment}" == prod ]]; then
  namespace=prod
else
  namespace="${PREVIEW_NAME:-${PR_NUMBER:+pr-${PR_NUMBER}}}"
  : "${namespace:?Set PR_NUMBER or PREVIEW_NAME for this ${environment} host}"
  [[ "${namespace}" =~ ^[a-z0-9-]+$ ]] || { echo "Invalid ${environment} host label" >&2; exit 1; }
  site_url="https://${namespace}.${environment}.policeconduct.org"
fi

if [[ "${skip_build}" == false ]]; then
  if [[ "${environment}" == prod ]]; then
    if [[ "$(git branch --show-current)" != main ]]; then
      echo "Only main builds may be deployed to prod." >&2
      exit 1
    fi
    # A production release uploads its sourcemaps to Sentry.
    PR_NUMBER="" SENTRY_SOURCEMAPS=upload npm run build
  else
    SITE_URL="${site_url}" npm run build
  fi
fi

npm run validate:redirects
args=()
if [[ "${dry_run}" == true ]]; then args+=(--dry-run); fi
CLOUDFRONT_DIST_ID="${distribution}" bash scripts/upload-release.sh "${namespace}" "${bucket}" "${data_bucket}" "${store}" ${args[@]+"${args[@]}"}

if [[ "${dry_run}" == false && "${environment}" != prod ]]; then
  echo "Published ${site_url}"
fi
