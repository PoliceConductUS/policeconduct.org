#!/usr/bin/env bash
set -euo pipefail

# Read only. Without the operator's inputs Terraform plans against variable
# defaults, which changes or removes every resource those inputs define.
STACK_DIR="${1:?Usage: require-terraform-var-file.sh STACK_DIR}"
if [[ -f "${STACK_DIR}/terraform.tfvars" ]]; then
  exit 0
fi

echo "Error: refusing apply: ${STACK_DIR}/terraform.tfvars is missing." >&2
echo "It is git-ignored, so a new checkout or worktree does not have it." >&2
common_dir="$(git -C "${STACK_DIR}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
stack_path="$(git -C "${STACK_DIR}" rev-parse --show-prefix 2>/dev/null || true)"
if [[ -n "${common_dir}" && -n "${stack_path}" ]]; then
  main_tfvars="$(dirname "${common_dir}")/${stack_path}terraform.tfvars"
  if [[ -f "${main_tfvars}" ]]; then
    echo "Link the one from the main checkout, then run again:" >&2
    echo "  ln -s \"${main_tfvars}\" \"${STACK_DIR}/terraform.tfvars\"" >&2
  fi
fi
exit 1
