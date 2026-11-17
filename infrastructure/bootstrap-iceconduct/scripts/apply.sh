#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Fail before environment loading, package installation, or any apply phase.
bash "${ROOT_DIR}/../../scripts/require-terraform-state.sh" "${ROOT_DIR}"

bash "${ROOT_DIR}/../../scripts/require-terraform-account.sh" "${ROOT_DIR}"

bash "${ROOT_DIR}/../../scripts/terraform-reviewed-apply.sh" "${ROOT_DIR}" "$@"
