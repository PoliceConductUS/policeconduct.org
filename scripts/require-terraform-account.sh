#!/usr/bin/env bash
set -euo pipefail

root="${1:?Terraform root is required}"
for command in aws terraform jq; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Error: $command is required to verify the Terraform account." >&2
    exit 1
  fi
done
caller="$(aws sts get-caller-identity --query Account --output text)"
if [[ ! "$caller" =~ ^[0-9]{12}$ ]]; then
  echo "Error: AWS caller account is missing or invalid." >&2
  exit 1
fi
# Read only managed attributes; data sources may describe other accounts.
# Evidence is the account in a managed aws_ resource ARN, or the AWS account a
# managed Google workload identity provider trusts. The bootstrap-recaptcha root
# manages no aws_ resource, so the provider is its only evidence.
accounts="$(terraform -chdir="$root" state pull | jq -er '
  ([.resources[] | select(.mode == "managed" and (.type | startswith("aws_")))
   | .instances[].attributes | .. | strings
   | select(test("^arn:[^:]+:[^:]+:[^:]*:[0-9]{12}:"))
   | split(":")[4]]
  + [.resources[] | select(.mode == "managed" and .type == "google_iam_workload_identity_pool_provider")
   | .instances[].attributes.aws[]?.account_id | strings
   | select(test("^[0-9]{12}$"))])
  | unique | if length > 0 then .[] else error("No managed AWS account evidence") end
')"
if [[ "$accounts" != "$caller" ]]; then
  echo "Error: AWS caller does not match the single managed account in this Terraform root." >&2
  echo "Caller: $caller; state accounts: $accounts" >&2
  exit 1
fi
