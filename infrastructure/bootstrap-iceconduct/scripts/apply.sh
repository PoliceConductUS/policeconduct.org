#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Fail before environment loading, package installation, or any apply phase.
bash "${ROOT_DIR}/../../scripts/require-terraform-state.sh" "${ROOT_DIR}"

terraform -chdir="${ROOT_DIR}" apply "$@"
ENV_FILE_NAME="${ENV_FILE_NAME:-.env-iceconduct}" bash "${SCRIPT_DIR}/sync-env.sh"
