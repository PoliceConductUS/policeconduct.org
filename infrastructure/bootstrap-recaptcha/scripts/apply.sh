#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Refuse an unbound checkout before apply.
bash "${ROOT_DIR}/../../scripts/require-terraform-state.sh" "${ROOT_DIR}"

# Refuse an AWS caller other than the account that the workload identity
# provider in this state trusts.
bash "${ROOT_DIR}/../../scripts/require-terraform-account.sh" "${ROOT_DIR}"

bash "${ROOT_DIR}/../../scripts/terraform-reviewed-apply.sh" "${ROOT_DIR}" "$@"
