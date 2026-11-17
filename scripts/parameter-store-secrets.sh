#!/usr/bin/env bash
# Sourced, not executed. Secrets live only in AWS Systems Manager Parameter Store,
# as SecureString parameters named /policeconduct/secrets/<ENV_NAME>.

# Usage: load_parameter_store_secrets ENV_NAME...
# Exports each named secret. The stored value replaces any value already in the
# environment, so a stale local copy can never be used.
load_parameter_store_secrets() {
  local name stored type value
  for name in "$@"; do
    # Text output is the type, a tab, then the value.
    if ! stored="$(aws ssm get-parameter \
      --region "${PARAMETER_STORE_REGION:-us-east-1}" \
      --name "/policeconduct/secrets/${name}" \
      --with-decryption \
      --query 'Parameter.[Type,Value]' \
      --output text)"; then
      echo "Error: could not read /policeconduct/secrets/${name} from Parameter Store." >&2
      echo "Check AWS_PROFILE and that the parameter exists." >&2
      return 1
    fi
    type="${stored%%$'\t'*}"
    if [[ "${type}" != "SecureString" ]]; then
      echo "Error: /policeconduct/secrets/${name} in Parameter Store must be a SecureString, but its type is '${type}'." >&2
      return 1
    fi
    value="${stored#*$'\t'}"
    if [[ -z "${value}" || "${value}" == "None" ]]; then
      echo "Error: /policeconduct/secrets/${name} in Parameter Store is empty." >&2
      return 1
    fi
    export "${name}=${value}"
  done
}
