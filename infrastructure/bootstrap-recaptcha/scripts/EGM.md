# bootstrap-recaptcha/scripts

## Overview

Holds one file, `apply.sh`, the guarded apply wrapper for the
`bootstrap-recaptcha` Terraform root in the parent directory. It resolves the
stack directory and runs three shared scripts from the repository `scripts/`
directory in a fixed order, stopping at the first failure.

## Interface

- `bash apply.sh [terraform plan arguments...] [-auto-approve|--auto-approve]` —
  the only entry point. It defines no flags itself; every argument is forwarded
  unchanged as `"$@"` to `terraform-reviewed-apply.sh`. `[apply.sh:"$@"]`
- Positional arguments: none are consumed by `apply.sh`. The stack directory
  passed to each helper is the parent of the script's own directory, so the
  wrapper works from any current directory. `[apply.sh:ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"]`
- Forwarded flag `-auto-approve` / `--auto-approve` (default: off): removed from
  the plan arguments by the helper and used to skip the interactive `yes` prompt.
  `[../../../scripts/terraform-reviewed-apply.sh:auto_approve=1]`
- All other forwarded arguments become `terraform plan` arguments.
  `[../../../scripts/terraform-reviewed-apply.sh:plan_args+=("${arg}")]`
- Environment variable read (by a helper, not by `apply.sh`):
  `TERRAFORM_APPROVED_DESTROYS`, a newline-separated list of resource addresses
  whose destroy or replacement is approved; default empty.
  `[../../../scripts/require-approved-terraform-destroys.sh:TERRAFORM_APPROVED_DESTROYS:-]`
- `apply.sh` sets and exports no environment variables, reads no `.env` file, and
  writes no environment file. The only commands in it are the three helper
  invocations. `[apply.sh:set -euo pipefail]`
- Exit codes: `0` when the plan reports no changes or the apply succeeds; `1`
  when the state guard refuses, the account guard finds the caller account
  invalid or different from the state's account, `terraform plan` fails, an
  unapproved destroy is planned, or the prompt answer is not `yes`; a non-zero
  status of the failing command when `aws sts get-caller-identity`, the state
  pull, or the account `jq` filter fails (including a state with no account
  evidence); otherwise the exit status of `terraform apply`.
  `[../../../scripts/require-terraform-account.sh:AWS caller does not match the single managed account in this Terraform root.]`
  `[../../../scripts/require-terraform-account.sh:error("No managed AWS account evidence")]`
  `[../../../scripts/terraform-reviewed-apply.sh:Apply cancelled. Nothing was changed.]`
- Callers: `scripts/bootstrap-all.sh` runs this wrapper first, with no arguments,
  before the `bootstrap-policeconduct` wrapper.
  `[../../../scripts/bootstrap-all.sh:bash infrastructure/bootstrap-recaptcha/scripts/apply.sh]`
- Callers (tests): `scripts/require-terraform-state.test.mjs` copies this wrapper
  into a fixture stack. `[../../../scripts/require-terraform-state.test.mjs:"recaptcha"]`
  `scripts/terraform-read-failures.test.mjs` runs it against a stubbed `aws` and
  `terraform`. `[../../../scripts/terraform-read-failures.test.mjs:const recaptchaWrapper = "infrastructure/bootstrap-recaptcha/scripts/apply.sh";]`
- Syntax-checked by the root `validate:shell` script.
  `[../../../package.json:infrastructure/bootstrap-*/scripts/*.sh]`

## Invariants

- Any failing step aborts the wrapper; later steps never run.
  `[apply.sh:set -euo pipefail]`
- Order is fixed: state guard, account guard, then reviewed apply.
  `[apply.sh:Refuse an unbound checkout before apply.]`
  `[apply.sh:Refuse an AWS caller other than the account that the workload identity]`
- Account guard: this root manages no `aws_` resource, so its account evidence
  is the AWS account that the managed
  `google_iam_workload_identity_pool_provider` trusts. The caller account from
  `aws sts get-caller-identity` must equal it. Data sources, including
  `data.aws_caller_identity`, are not evidence.
  `[../../../scripts/require-terraform-account.sh:select(.mode == "managed" and .type == "google_iam_workload_identity_pool_provider")]`
  `[../../../scripts/require-terraform-account.sh:.instances[].attributes.aws[]?.account_id]`
- State guard: the pulled state must be version 4 and hold at least one managed
  resource instance, otherwise the wrapper exits `1`.
  `[../../../scripts/require-terraform-state.sh:.version == 4 and]`
- The plan that is reviewed is the plan that is applied: one saved plan file is
  written, inspected, and passed to `terraform apply`.
  `[../../../scripts/terraform-reviewed-apply.sh:terraform -chdir="${STACK_DIR}" apply "${PLAN_DIR}/tfplan"]`
- A plan that deletes or replaces a managed resource not listed in
  `TERRAFORM_APPROVED_DESTROYS` is refused before the prompt.
  `[../../../scripts/require-approved-terraform-destroys.sh:index("delete")]`
- Required commands on `PATH`: `aws`, `terraform` and `jq`.
  `[../../../scripts/require-terraform-state.sh:terraform and jq are required to verify existing state.]`
  `[../../../scripts/require-terraform-account.sh:for command in aws terraform jq; do]`

## Side Effects

- Subprocess: `bash scripts/require-terraform-state.sh <stack dir>`, which runs
  `terraform state pull` (reads the remote S3 state) and `jq`.
  `[apply.sh:require-terraform-state.sh]`
- Subprocess: `bash scripts/require-terraform-account.sh <stack dir>`, which
  runs `aws sts get-caller-identity`, `terraform state pull` and `jq`.
  `[../../../scripts/require-terraform-account.sh:caller="$(aws sts get-caller-identity --query Account --output text)"]`
- Subprocess: `bash scripts/terraform-reviewed-apply.sh <stack dir> "$@"`, which
  runs `terraform plan -detailed-exitcode -out=<plan>`, `terraform show -json`,
  and `terraform apply <plan>`.
  `[../../../scripts/terraform-reviewed-apply.sh:plan -detailed-exitcode]`
- Files written: one plan file `tfplan` inside a fresh `mktemp -d` directory
  outside the repository; the directory is deleted on exit.
  `[../../../scripts/terraform-reviewed-apply.sh:trap 'rm -rf "${PLAN_DIR}"' EXIT]`
- Reads standard input for the `yes` confirmation unless auto-approve is set.
  `[../../../scripts/terraform-reviewed-apply.sh:Apply exactly this plan? Only 'yes' will be accepted: ]`
- A successful apply changes live Google Cloud resources and the remote Terraform
  state of the parent stack; see [../EGM.md](../EGM.md).
  `[apply.sh:terraform-reviewed-apply.sh]`

## Verification

- Run: `npm run test:infra`
