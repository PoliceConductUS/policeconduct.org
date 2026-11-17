#!/usr/bin/env bash
# Sourced, not executed. Secrets live only in AWS Systems Manager Parameter Store,
# as SecureString parameters named /policeconduct/secrets/<ENV_NAME>.

# Usage: load_parameter_store_secrets ENV_NAME...
# Exports each named secret. The stored value replaces any value already in the
# environment, so a stale local copy can never be used.
load_parameter_store_secrets() {
  local name value
  for name in "$@"; do
    if ! value="$(aws ssm get-parameter \
      --region "${PARAMETER_STORE_REGION:-us-east-1}" \
      --name "/policeconduct/secrets/${name}" \
      --with-decryption \
      --query Parameter.Value \
      --output text)"; then
      echo "Error: could not read /policeconduct/secrets/${name} from Parameter Store." >&2
      echo "Check AWS_PROFILE and that the parameter exists." >&2
      return 1
    fi
    if [[ -z "${value}" || "${value}" == "None" ]]; then
      echo "Error: /policeconduct/secrets/${name} in Parameter Store is empty." >&2
      return 1
    fi
    export "${name}=${value}"
  done
}
