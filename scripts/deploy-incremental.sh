#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SKIP_BUILD=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run)    DRY_RUN=true ;;
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
tf_env="$(node scripts/terraform-outputs.mjs S3_BUCKET KVS_ARN RELEASE_DATA_BUCKET CLOUDFRONT_DIST_ID)"
eval "${tf_env}"

if [[ "$DRY_RUN" == false ]]; then
  bash scripts/workspace-sync.sh preflight production
fi

: "${S3_BUCKET:?S3_BUCKET is required}"
: "${KVS_ARN:?KVS_ARN is required (production redirect store)}"
: "${RELEASE_DATA_BUCKET:?RELEASE_DATA_BUCKET is required}"

if [[ "$SKIP_BUILD" == false && "$(git branch --show-current)" != main ]]; then
  echo "Only main builds may be deployed to the site bucket." >&2
  exit 1
fi
if [[ "$SKIP_BUILD" == false ]]; then
  # A production release uploads its sourcemaps to Sentry.
  PR_NUMBER="" PREVIEW_NAME="" SENTRY_SOURCEMAPS=upload npm run build
fi
npm run validate:redirects
args=()
if [[ "$DRY_RUN" == true ]]; then args+=(--dry-run); fi
bash scripts/upload-release.sh prod "${S3_BUCKET}" "${RELEASE_DATA_BUCKET}" "${KVS_ARN}" "${args[@]}"
if [[ "$DRY_RUN" == false ]]; then
  bash scripts/workspace-sync.sh after production
fi
