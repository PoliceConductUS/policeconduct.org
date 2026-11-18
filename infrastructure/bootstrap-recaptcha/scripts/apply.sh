#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Refuse an unbound checkout before apply.
bash "${ROOT_DIR}/../../scripts/require-terraform-state.sh" "${ROOT_DIR}"

bash "${ROOT_DIR}/../../scripts/terraform-reviewed-apply.sh" "${ROOT_DIR}" "$@"
