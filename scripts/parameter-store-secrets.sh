#!/usr/bin/env bash
# Sourced, not executed. Secrets live only in AWS Systems Manager Parameter Store,
# as SecureString parameters. A secret every environment shares is named
# /policeconduct.org/default/secrets/<ENV_NAME>. A secret that differs by environment is named
# /policeconduct.org/<environment>/secrets/<ENV_NAME>, where the environment is
# production or preview.

# Usage: read_parameter_store_secret PARAMETER_NAME
# Prints the stored value. Fails unless the parameter is a SecureString that is
# not empty.
read_parameter_store_secret() {
  local parameter="$1" stored type value
  # Text output is the type, a tab, then the value.
  if ! stored="$(aws ssm get-parameter \
    --region "${PARAMETER_STORE_REGION:-us-east-1}" \
    --name "${parameter}" \
    --with-decryption \
    --query 'Parameter.[Type,Value]' \
    --output text)"; then
    echo "Error: could not read ${parameter} from Parameter Store." >&2
    echo "Check AWS_PROFILE and that the parameter exists." >&2
    return 1
  fi
  type="${stored%%$'\t'*}"
  if [[ "${type}" != "SecureString" ]]; then
    echo "Error: ${parameter} in Parameter Store must be a SecureString, but its type is '${type}'." >&2
    return 1
  fi
  value="${stored#*$'\t'}"
  if [[ -z "${value}" || "${value}" == "None" ]]; then
    echo "Error: ${parameter} in Parameter Store is empty." >&2
    return 1
  fi
  printf '%s' "${value}"
}

# Usage: load_parameter_store_secrets ENV_NAME...
# Exports each named shared secret. The stored value replaces any value already
# in the environment, so a stale local copy can never be used.
load_parameter_store_secrets() {
  local name value
  for name in "$@"; do
    value="$(read_parameter_store_secret "/policeconduct.org/default/secrets/${name}")" || return 1
    export "${name}=${value}"
  done
}
