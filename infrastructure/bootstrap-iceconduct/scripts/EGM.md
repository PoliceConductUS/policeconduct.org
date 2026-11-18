# bootstrap-iceconduct/scripts

## Overview

Holds one production file, `apply.sh`, the guarded apply wrapper for the
`bootstrap-iceconduct` Terraform root in the parent directory. The wrapper has no
logic of its own beyond resolving the stack directory: it runs three shared
scripts from the repository `scripts/` directory in a fixed order and stops at the
first one that fails. `redirect.test.mjs` in this directory is a test file and is
not documented here.

## Interface

- `bash apply.sh [terraform plan arguments...] [-auto-approve|--auto-approve]` —
  the only entry point. It defines no flags itself; every argument is forwarded
  unchanged as `"$@"` to `terraform-reviewed-apply.sh`. `[apply.sh:"$@"]`
- Positional arguments: none are consumed by `apply.sh`. The stack directory
  passed to each helper is computed as the parent of the script's own directory,
  so the wrapper works from any current directory. `[apply.sh:ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"]`
- Forwarded flag `-auto-approve` / `--auto-approve` (default: off): removed from
  the plan arguments by the helper and used to skip the interactive `yes` prompt.
  `[../../../scripts/terraform-reviewed-apply.sh:auto_approve=1]`
- All other forwarded arguments become `terraform plan` arguments.
  `[../../../scripts/terraform-reviewed-apply.sh:plan_args+=("${arg}")]`
- Environment variable read (by a helper, not by `apply.sh`):
  `TERRAFORM_APPROVED_DESTROYS`, a newline-separated list of resource addresses
  whose destroy or replacement is approved; default empty.
  `[../../../scripts/require-approved-terraform-destroys.sh:TERRAFORM_APPROVED_DESTROYS:-]`
- `apply.sh` sets and exports no environment variables and loads no `.env` file.
  `[apply.sh:set -euo pipefail]`
- Exit codes: `0` when the plan reports no changes or the apply succeeds; `1`
  when a guard refuses, `terraform plan` fails, or the prompt answer is not
  `yes`; otherwise the exit status of `terraform apply`.
  `[../../../scripts/terraform-reviewed-apply.sh:Apply cancelled. Nothing was changed.]`
- Exit codes from the account guard are not always `1`: when
  `aws sts get-caller-identity` fails, or when the state pull or its `jq` filter
  fails (including state with no account ARN in a managed `aws_` resource), the
  wrapper exits with that command's non-zero status.
  `[../../../scripts/require-terraform-account.sh:No managed AWS account evidence]`
- Callers: `scripts/terraform-read-failures.test.mjs` executes this wrapper with
  stubbed commands, and `scripts/require-terraform-state.test.mjs` copies it into
  a fixture stack. No root `package.json` script runs it for a real apply.
  `[../../../scripts/terraform-read-failures.test.mjs:infrastructure/bootstrap-iceconduct/scripts/apply.sh]`
- Syntax-checked by the root `validate:shell` script.
  `[../../../package.json:infrastructure/bootstrap-*/scripts/*.sh]`

## Invariants

- Any failing step aborts the wrapper; later steps never run.
  `[apply.sh:set -euo pipefail]`
- Order is fixed: state guard, then account guard, then reviewed apply. The state
  guard runs before anything else.
  `[apply.sh:Fail before environment loading, package installation, or any apply phase.]`
- State guard: the pulled state must be version 4 and hold at least one managed
  resource instance, otherwise the wrapper exits `1`.
  `[../../../scripts/require-terraform-state.sh:.version == 4 and]`
- Account guard: the AWS caller account must equal the single account found in
  the ARNs of managed `aws_` resources in state, otherwise the wrapper exits `1`.
  `[../../../scripts/require-terraform-account.sh:AWS caller does not match the single managed account in this Terraform root.]`
- Account guard: a caller account that is not a 12-digit number also exits `1`.
  `[../../../scripts/require-terraform-account.sh:AWS caller account is missing or invalid.]`
- The plan that is reviewed is the plan that is applied: one saved plan file is
  written, inspected, and passed to `terraform apply`.
  `[../../../scripts/terraform-reviewed-apply.sh:terraform -chdir="${STACK_DIR}" apply "${PLAN_DIR}/tfplan"]`
- A plan that deletes or replaces a managed resource not listed in
  `TERRAFORM_APPROVED_DESTROYS` is refused before the prompt.
  `[../../../scripts/require-approved-terraform-destroys.sh:index("delete")]`
- Required commands on `PATH`: `terraform`, `jq`, and `aws`.
  `[../../../scripts/require-terraform-account.sh:for command in aws terraform jq; do]`

## Side Effects

- Subprocess: `bash scripts/require-terraform-state.sh <stack dir>`, which runs
  `terraform state pull` (reads the remote S3 state) and `jq`.
  `[apply.sh:require-terraform-state.sh]`
- Subprocess: `bash scripts/require-terraform-account.sh <stack dir>`, which
  calls AWS STS `get-caller-identity` and runs `terraform state pull`.
  `[../../../scripts/require-terraform-account.sh:aws sts get-caller-identity --query Account --output text]`
- Subprocess: `bash scripts/terraform-reviewed-apply.sh <stack dir> "$@"`, which
  runs `terraform plan -detailed-exitcode -out=<plan>`, `terraform show -json`,
  and `terraform apply <plan>`.
  `[../../../scripts/terraform-reviewed-apply.sh:plan -detailed-exitcode]`
- Files written: one plan file `tfplan` inside a fresh `mktemp -d` directory
  outside the repository; the directory is deleted on exit.
  `[../../../scripts/terraform-reviewed-apply.sh:trap 'rm -rf "${PLAN_DIR}"' EXIT]`
- Reads standard input for the `yes` confirmation unless auto-approve is set.
  `[../../../scripts/terraform-reviewed-apply.sh:Apply exactly this plan? Only 'yes' will be accepted: ]`
- A successful apply changes the live AWS resources and the remote Terraform
  state of the parent stack; see [../EGM.md](../EGM.md).
  `[apply.sh:terraform-reviewed-apply.sh]`

## Verification

- Run: `npm run test:infra`
- `redirect.test.mjs` is not part of any root `package.json` script; run it with
  `node --test infrastructure/bootstrap-iceconduct/scripts/redirect.test.mjs`.
  `[redirect.test.mjs:maps only the hostname for]`
