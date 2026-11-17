#!/usr/bin/env bash
set -euo pipefail

# Read only: never initialize, migrate, import, plan, or apply from this guard.
STACK_DIR="${1:?Usage: require-terraform-state.sh STACK_DIR}"
if ! command -v terraform >/dev/null || ! command -v jq >/dev/null; then
  echo "Error: terraform and jq are required to verify existing state." >&2
  exit 1
fi
if ! terraform -chdir="${STACK_DIR}" state pull | jq -e '
  .version == 4 and
  ([.resources[]? | select(.mode == "managed") | .instances[]?] | length > 0)
' >/dev/null; then
  echo "Error: refusing apply: Terraform state is missing, unreadable, invalid, or has no managed instances." >&2
  echo "Restore and verify the existing backend/state before retrying. Do not bootstrap the live stack again." >&2
  if [[ ! -f "${STACK_DIR}/.terraform/terraform.tfstate" ]]; then
    echo "This directory has not been initialized, so the existing state could not be read." >&2
    echo "With credentials for the account that holds the state, run: terraform -chdir=\"${STACK_DIR}\" init" >&2
  fi
  exit 1
fi
