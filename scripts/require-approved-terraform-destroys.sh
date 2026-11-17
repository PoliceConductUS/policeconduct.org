#!/usr/bin/env bash
set -euo pipefail

# Read only: reads `terraform show -json <plan>` on stdin and refuses a plan that
# destroys or replaces a managed resource the operator did not name.
# TERRAFORM_APPROVED_DESTROYS holds the approved resource addresses, one per line.
if ! command -v jq >/dev/null; then
  echo "Error: jq is required to inspect the Terraform plan." >&2
  exit 1
fi

if ! planned="$(jq -er '
  if (.resource_changes | type) != "array" then error("no resource_changes") else
    [.resource_changes[]
     | select(.mode == "managed" and (.change.actions | index("delete")))
     | .address] | unique | join("\n")
  end
')"; then
  echo "Error: refusing apply: the Terraform plan could not be read." >&2
  exit 1
fi

unapproved=()
while IFS= read -r address; do
  [[ -n "${address}" ]] || continue
  if ! grep -Fxq -- "${address}" <<<"${TERRAFORM_APPROVED_DESTROYS:-}"; then
    unapproved+=("${address}")
  fi
done <<<"${planned}"

if [[ ${#unapproved[@]} -eq 0 ]]; then
  exit 0
fi

echo "Error: refusing apply: the plan destroys or replaces ${#unapproved[@]} resource(s) nobody approved:" >&2
printf ' - %s\n' "${unapproved[@]}" >&2
echo "Nothing was changed. A wrong or missing input is the usual cause." >&2
echo "If every destroy above is intended, list the addresses, one per line, in TERRAFORM_APPROVED_DESTROYS and run again." >&2
exit 1
