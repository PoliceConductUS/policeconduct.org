#!/usr/bin/env bash
set -euo pipefail

# Plan once, refuse destroys nobody approved, then apply exactly that plan.
# Usage: terraform-reviewed-apply.sh STACK_DIR [terraform plan arguments...]
STACK_DIR="${1:?Usage: terraform-reviewed-apply.sh STACK_DIR [terraform plan arguments...]}"
shift
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

plan_args=()
auto_approve=0
for arg in "$@"; do
  if [[ "${arg}" == "-auto-approve" || "${arg}" == "--auto-approve" ]]; then
    auto_approve=1
  else
    plan_args+=("${arg}")
  fi
done

# The plan file holds secrets: keep it outside the repository and remove it on exit.
PLAN_DIR="$(mktemp -d)"
trap 'rm -rf "${PLAN_DIR}"' EXIT

set +e
terraform -chdir="${STACK_DIR}" plan -detailed-exitcode -out="${PLAN_DIR}/tfplan" ${plan_args[@]+"${plan_args[@]}"}
plan_status=$?
set -e
case "${plan_status}" in
  0)
    echo "Live infrastructure already matches the configuration. Nothing to apply."
    exit 0
    ;;
  2) ;;
  *)
    echo "Error: terraform plan failed. Nothing was changed." >&2
    exit 1
    ;;
esac

terraform -chdir="${STACK_DIR}" show -json "${PLAN_DIR}/tfplan" \
  | bash "${SCRIPT_DIR}/require-approved-terraform-destroys.sh"

if [[ ${auto_approve} -eq 0 ]]; then
  read -r -p "Apply exactly this plan? Only 'yes' will be accepted: " answer || answer=""
  if [[ "${answer}" != "yes" ]]; then
    echo "Apply cancelled. Nothing was changed." >&2
    exit 1
  fi
fi

terraform -chdir="${STACK_DIR}" apply "${PLAN_DIR}/tfplan"
