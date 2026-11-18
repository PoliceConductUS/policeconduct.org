#!/usr/bin/env bash
# preflight is read-only; after runs only after a successful hosting upload.
set -euo pipefail
stage="${1:?stage required}"
environment="${2:?environment required}"
case "$stage" in preflight|after) ;; *) echo 'Invalid workspace sync stage' >&2; exit 2 ;; esac
[[ "$environment" =~ ^[a-z][a-z0-9-]*$ ]] || { echo 'Invalid deployment environment' >&2; exit 2; }
choice="${WORKSPACE_SYNC:-}"
case "$choice" in
  upload|skip) ;;
  '')
    if [[ ! -t 0 ]]; then
      echo 'Set WORKSPACE_SYNC=upload or WORKSPACE_SYNC=skip for noninteractive deployment.' >&2
      exit 2
    fi
    if [[ "$stage" == preflight ]]; then exit 0; fi
    printf 'Hosting upload succeeded. Upload workspace %s to private storage? [y/N] ' "${INTAKE_WORKSPACE:-not configured}"
    answer=''
    read -r answer || true
    case "$answer" in y|Y|yes|YES) choice=upload ;; *) choice=skip ;; esac
    ;;
  *) echo 'WORKSPACE_SYNC must be upload or skip.' >&2; exit 2 ;;
esac
if [[ "$choice" == skip ]]; then
  if [[ "$stage" == after ]]; then echo 'Hosting upload succeeded; workspace sync skipped.'; fi
  exit 0
fi
: "${INTAKE_WORKSPACE:?INTAKE_WORKSPACE must match the uploaded build}"
: "${INTAKE_WORKSPACE_BUCKET:?INTAKE_WORKSPACE_BUCKET is required}"
if [[ ! -d "$INTAKE_WORKSPACE" ]]; then
  echo 'Workspace must be an existing directory.' >&2
  exit 2
fi
if [[ "$stage" == preflight ]]; then exit 0; fi
if node "$(dirname "${BASH_SOURCE[0]}")/intake-workspace-sync.mjs" sync --direction upload --bucket "$INTAKE_WORKSPACE_BUCKET"; then
  echo 'Hosting upload and workspace upload succeeded.'
else
  code=$?
  echo "Hosting upload succeeded; workspace upload FAILED (exit ${code}). No hosting rollback was attempted." >&2
  exit "$code"
fi
