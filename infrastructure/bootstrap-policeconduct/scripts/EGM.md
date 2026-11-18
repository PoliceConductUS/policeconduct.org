# Bootstrap Stack Scripts (`scripts/`)

## Overview

Three Bash scripts that operate the `bootstrap-policeconduct` Terraform root:

- `apply.sh` prepares the environment (profile, secrets, reCAPTCHA inputs,
  Lambda dependencies) and then hands off to the repo's
  reviewed Terraform apply wrapper.
- `cloudfront_lookup.sh` is a Terraform `external` data-source program that looks
  up existing CloudFront resources by name or alias.
- `deploy-forms-api.sh` releases Forms API Lambda code only; Terraform keeps
  ownership of all Lambda configuration.

All three run with `set -euo pipefail`. Paths below are relative to this
directory unless stated; "repo root" is three levels up.

## Interface

### `apply.sh`

Callers: repo root `scripts/bootstrap-all.sh` and operators directly (documented
in the repo root `README.md`).

- Positional arguments: every argument is forwarded unchanged to
  `scripts/terraform-reviewed-apply.sh` after the stack directory, as extra
  Terraform plan arguments. There are no flags of its own. [apply.sh:terraform-reviewed-apply.sh" "${ROOT_DIR}" "$@"]
- `PHASE` (environment, default `full`): `full` applies the whole stack;
  `foundation` applies a fixed list of `-target=` addresses (state, site,
  preview and forms buckets with their access-block, ownership, versioning and
  encryption resources; the bucket policies of the state and forms buckets only,
  not of the site and preview buckets; forms KMS keys and aliases; forms Lambda IAM
  roles and policies; the prod and preview forms Lambda functions, Function URLs
  and permissions). Any other value prints an error and exits 1. [apply.sh:PHASE="${PHASE:-full}"] [apply.sh:run_foundation_apply] [apply.sh:"aws_s3_bucket_policy.terraform_state_tls_only"]
- `AWS_PROFILE` (environment): used as set; when empty, the last
  `AWS_PROFILE=` line of the repo root `.env` is read with `sed` (the file is not
  sourced at this point), stripped of quotes, and exported. That value is used
  by the state guard; when `.env` is sourced afterwards, an `AWS_PROFILE`
  assignment in it replaces the shell's value for every later step. [apply.sh:sed -n 's/^AWS_PROFILE=//p'] [apply.sh:load_dotenv_if_present]
- Repo root `.env` (optional): if present it is sourced with `set -a`, so every
  assignment in it becomes an exported variable. [apply.sh:load_env_file_if_present]
- Plain environment names mapped to Terraform inputs when the `TF_VAR_` form is
  not already set (`map_common_env_to_tf_vars`): [apply.sh:map_common_env_to_tf_vars]
  - `SENTRY_AUTH_TOKEN` to `TF_VAR_sentry_auth_token` [apply.sh:TF_VAR_sentry_auth_token="${SENTRY_AUTH_TOKEN}"]
  - `SENTRY_DSN_PRODUCTION` to `TF_VAR_sentry_dsn_production` [apply.sh:TF_VAR_sentry_dsn_production]
  - `SENTRY_DSN_PREVIEW` to `TF_VAR_sentry_dsn_preview` [apply.sh:TF_VAR_sentry_dsn_preview]
  - `GA_MEASUREMENT_ID_PRODUCTION` to `TF_VAR_ga_measurement_id_production` [apply.sh:TF_VAR_ga_measurement_id_production]
  - `GA_MEASUREMENT_ID_PREVIEW` to `TF_VAR_ga_measurement_id_preview` [apply.sh:TF_VAR_ga_measurement_id_preview]
  - `RECAPTCHA_SITE_KEY` to `TF_VAR_recaptcha_site_key` [apply.sh:TF_VAR_recaptcha_site_key="${RECAPTCHA_SITE_KEY}"]
  - `RECAPTCHA_PROJECT_ID` to `TF_VAR_recaptcha_project_id` [apply.sh:TF_VAR_recaptcha_project_id="${RECAPTCHA_PROJECT_ID}"]
  - `RECAPTCHA_SERVICE_ACCOUNT_EMAIL` to `TF_VAR_recaptcha_service_account_email` [apply.sh:TF_VAR_recaptcha_service_account_email="${RECAPTCHA_SERVICE_ACCOUNT_EMAIL}"]
  - `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME` to
    `TF_VAR_recaptcha_wif_provider_resource_name` [apply.sh:TF_VAR_recaptcha_wif_provider_resource_name="${RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME}"]
  - `RECAPTCHA_WIF_AUDIENCE` to `TF_VAR_recaptcha_wif_audience` [apply.sh:TF_VAR_recaptcha_wif_audience="${RECAPTCHA_WIF_AUDIENCE}"]
- Other environment variables set and exported:
  - `TF_VAR_forms_email_resend_api_key_production` and
    `TF_VAR_forms_email_resend_api_key_preview`, each read from its own
    environment's Parameter Store path (`/policeconduct.org/production/secrets/RESEND_API_KEY`
    and `/policeconduct.org/preview/secrets/RESEND_API_KEY`). [apply.sh:read_parameter_store_secret /policeconduct.org/preview/secrets/RESEND_API_KEY]
  - `SENTRY_AUTH_TOKEN` and `GITHUB_TOKEN`, loaded by
    `load_parameter_store_secrets` from the sourced repo root
    `scripts/parameter-store-secrets.sh`. [apply.sh:load_parameter_store_secrets SENTRY_AUTH_TOKEN GITHUB_TOKEN]
  - The script does not set `github_org`, `github_repo` or
    `recaptcha_min_score`; `../policeconduct.auto.tfvars` sets them, and
    Terraform gives `*.auto.tfvars` values precedence over `TF_VAR_`
    environment variables. [../policeconduct.auto.tfvars:github_org] [../policeconduct.auto.tfvars:recaptcha_min_score]
  - The five reCAPTCHA names printed by repo root `scripts/terraform-outputs.mjs`,
    applied with `eval`. [apply.sh:eval "${recaptcha_env}"]
- Exit codes: 0 after printing `Bootstrap apply (<phase>) complete.`; 1 for a
  missing reCAPTCHA input, missing `npm`, or an invalid `PHASE`; otherwise the
  non-zero status of whichever helper or subprocess failed. [apply.sh:Bootstrap apply (${PHASE}) complete.] [apply.sh:PHASE must be either 'foundation' or 'full']
- `SENTRY_AUTH_TOKEN` is always loaded from Parameter Store first, and
  `map_common_env_to_tf_vars` then always sets `TF_VAR_sentry_auth_token` from
  it. [apply.sh:load_parameter_store_secrets SENTRY_AUTH_TOKEN GITHUB_TOKEN] [apply.sh:TF_VAR_sentry_auth_token="${SENTRY_AUTH_TOKEN}"]

### `cloudfront_lookup.sh`

Caller: `data "external" "cloudfront_existing"` in `../main.tf`
(`program = ["bash", ".../scripts/cloudfront_lookup.sh"]`). Covered by repo root
`scripts/terraform-read-failures.test.mjs`.

- Arguments and flags: none. Environment: only what the `aws` CLI itself reads. [cloudfront_lookup.sh:input="$(cat)"]
- Input: one JSON object on stdin with string keys `oac_name`,
  `index_function_name`, `preview_function_name`, `site_alias`, `preview_alias`. [cloudfront_lookup.sh:get_json_value "preview_alias"]
- Output: one JSON line on stdout with string keys `oac_id`,
  `index_function_arn`, `preview_function_arn`, `site_distribution_id`,
  `preview_distribution_id`. A resource that is not found is an empty string. [cloudfront_lookup.sh:"preview_distribution_id":"%s"]
- Exit codes: 0 on success (including "nothing found"); the `aws` CLI's non-zero
  status when any lookup call fails. [cloudfront_lookup.sh:|| return $?]

### `deploy-forms-api.sh`

Caller: operators directly. Covered by repo root
`scripts/deploy-forms-api.test.mjs`.

- `--apply`: perform the deployment. Default is a dry run that prints each
  mutating command prefixed with `[dry-run]`. [deploy-forms-api.sh:--apply)]
- `--topic-arn <arn>` (required): the submission-notifications SNS topic the
  live Lambdas are expected to use. Must be an SNS ARN in the expected account. [deploy-forms-api.sh:--topic-arn)]
- `--recipients <csv>` (required): the recipient list the live Lambdas are
  expected to carry. [deploy-forms-api.sh:--recipients)]
- `--only <csv>` (optional): comma-separated function names to deploy instead of
  the default `policeconduct-forms-api-preview` then
  `policeconduct-forms-api-prod`. [deploy-forms-api.sh:--only)]
- Any other argument: `FATAL unknown argument`, exit 1. A flag given without its
  value aborts with exit 1 through the shell's `${2:?}` error, not through
  `die`, so no `FATAL` line is printed. [deploy-forms-api.sh:unknown argument: $1] [deploy-forms-api.sh:TOPIC_ARN="${2:?}"]
- Environment: `AWS_PROFILE` (or other AWS CLI credentials) must resolve to the
  one AWS account hard-coded in `EXPECTED_ACCOUNT`. `TMPDIR=/tmp` is set for the
  `npm ci` subprocess only. [deploy-forms-api.sh:readonly EXPECTED_ACCOUNT] [deploy-forms-api.sh:TMPDIR=/tmp npm ci]
- Required tools on `PATH`: `aws`, `jq`, `zip` (checked), plus `npm`, `shasum`,
  `du`, `cut` and `mktemp` (unchecked). [deploy-forms-api.sh:jq not found]
- Exit codes: 0 on success or completed dry run; 1 from `die` (wrong account,
  missing or malformed flag, missing topic, unknown function name, unreadable or
  mismatched notification configuration, missing tool); otherwise the failing
  subprocess status. [deploy-forms-api.sh:die()]
- Output: progress lines on stdout (including the SHA-256 of `index.mjs`),
  warnings and fatal errors on stderr, and a closing block of manual
  verification commands that repeats that SHA-256 as the expected value. [deploy-forms-api.sh:index.mjs sha256: $SRC_SHA] [deploy-forms-api.sh:both must print: $SRC_SHA]

## Invariants

### `apply.sh`

- The Terraform state guard (repo root `scripts/require-terraform-state.sh`) runs
  before `.env` is sourced, before any package install and before any apply
  phase. [apply.sh:require-terraform-state.sh" "${ROOT_DIR}"]
- Secrets reach Terraform only from Parameter Store:
  `TF_VAR_sentry_auth_token` is unset after `.env` is loaded and is then
  re-derived from the Parameter Store value of `SENTRY_AUTH_TOKEN`. [apply.sh:unset TF_VAR_sentry_auth_token]
- Every `/policeconduct.org/` parameter must be a SecureString; the audit
  (`scripts/audit-parameter-store.mjs`) runs before any secret is read. [apply.sh:audit-parameter-store.mjs]
- Each forms Lambda receives its own environment's Resend key. A missing key
  stops the apply; there is no fallback from one environment to the other. [apply.sh:TF_VAR_forms_email_resend_api_key_production=]
- reCAPTCHA inputs come only from the `bootstrap-recaptcha` stack's Terraform
  outputs: the five plain names and their five `TF_VAR_` forms are unset before
  the outputs are read, so `.env` values cannot win. [apply.sh:unset TF_VAR_recaptcha_project_id]
- All five reCAPTCHA Terraform inputs (project id, site key, service account
  email, WIF provider resource name, WIF audience) must be non-empty, otherwise
  the script exits 1 and names each missing input. [apply.sh:preflight_recaptcha_requirements]
- The target AWS account is checked (repo root
  `scripts/require-terraform-account.sh`) before Lambda dependencies are
  installed and before Terraform runs. [apply.sh:preflight_account_check]
- Lambda dependencies are installed from the lockfiles with `npm ci --omit=dev`
  (never `npm install`) so the zipped packages match the reviewed lockfile. [apply.sh:npm ci --omit=dev --no-audit --no-fund]
- Terraform is never invoked directly; both phases go through repo root
  `scripts/terraform-reviewed-apply.sh`. [apply.sh:terraform-reviewed-apply.sh]
- `PHASE` is validated last, after all preflight work and dependency installs. [apply.sh:case "${PHASE}" in]
- An already-set `TF_VAR_` value is never overwritten by the plain-name mapping. [apply.sh:-z "${TF_VAR_sentry_dsn_production+x}"]

### `cloudfront_lookup.sh`

- stdout must contain exactly one flat JSON object of string values (the
  Terraform `external` protocol); nothing else is printed to stdout. [cloudfront_lookup.sh:printf '{"oac_id":"%s"]
- A failed `aws` call must fail the program rather than report "not found", so
  a read failure cannot be mistaken for an absent resource. [cloudfront_lookup.sh:|| return $?]
- The AWS CLI text value `None` is normalised to an empty string. [cloudfront_lookup.sh:normalize_none]
- CloudFront Functions are looked up in stage `DEVELOPMENT` first and in `LIVE`
  only if that returns nothing. [cloudfront_lookup.sh:--stage DEVELOPMENT]
- Input values are extracted with `sed`, so they must be simple JSON strings
  without escaped quotes. [cloudfront_lookup.sh:get_json_value()]

### `deploy-forms-api.sh`

- Dry run is the default; only `--apply` mutates AWS. [deploy-forms-api.sh:APPLY=0]
- The caller's account must equal `EXPECTED_ACCOUNT`, and `--topic-arn` must be
  an SNS ARN in that same account. [deploy-forms-api.sh:wrong AWS account]
- The topic must exist before any code is deployed. Zero confirmed
  subscriptions is a warning, not a failure. [deploy-forms-api.sh:no CONFIRMED subscription]
- The script never changes Lambda configuration. For every target it compares
  the live `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`,
  `SUBMISSION_NOTIFICATION_RECIPIENTS` and `NOTIFICATION_ENV_LABEL` (`preview`
  for the preview function, empty for prod) against the flags and aborts on any
  difference, before building or deploying anything. [deploy-forms-api.sh:reconcile bootstrap Terraform before deploying code]
- Only those three environment fields are queried; live secret values are never
  retrieved or printed. [deploy-forms-api.sh:Environment.Variables.{topic:SUBMISSION_NOTIFICATIONS_TOPIC_ARN]
- Only `policeconduct-forms-api-preview` and `policeconduct-forms-api-prod` are
  valid targets. [deploy-forms-api.sh:readonly PREVIEW_FN]
- Default order is preview first, then prod, with the same zip. [deploy-forms-api.sh:FUNCTIONS="${PREVIEW_FN},${PROD_FN}"]
- A rollback version is published before the code of each function is updated. [deploy-forms-api.sh:pre-INS-35 rollback point]
- The package is built from the lockfile with `npm ci --omit=dev` and contains
  exactly `index.mjs`, `package.json`, `native-domexception` and `node_modules`. [deploy-forms-api.sh:zip -r -X -q "$ZIP" index.mjs package.json native-domexception node_modules]
- Build identity is the SHA-256 of `index.mjs`, not the Lambda `CodeSha256`
  (zip metadata varies between builds). [deploy-forms-api.sh:SRC_SHA=]

## Side Effects

### `apply.sh`

- Reads the repo root `.env` when it exists: with `sed` for `AWS_PROFILE` only
  when `AWS_PROFILE` is empty, and then by sourcing it, which exports its
  contents into the process environment. [apply.sh:if [[ -z "${AWS_PROFILE:-}" ]]; then] [apply.sh:DOTENV_FILE="${REPO_ROOT}/.env"]
- Subprocesses, in order: `bash scripts/require-terraform-state.sh`,
  `node scripts/audit-parameter-store.mjs`, the Parameter Store reads performed
  by the sourced `scripts/parameter-store-secrets.sh` functions,
  `node scripts/terraform-outputs.mjs` (run from the repo root; it runs
  `terraform init` when `infrastructure/bootstrap-recaptcha` is not
  initialised, then `terraform output -json` there),
  `bash scripts/require-terraform-account.sh`, `npm ci` in
  `../lambdas/forms-api`, `npm --prefix ../lambdas/release-api ci`, and
  `bash scripts/terraform-reviewed-apply.sh`. [apply.sh:npm --prefix "${ROOT_DIR}/lambdas/release-api" ci] [../../../scripts/terraform-outputs.mjs:terraform init failed for]
- Writes (replaces) `node_modules` in `../lambdas/forms-api` and
  `../lambdas/release-api`. The forms install is skipped when its `package.json`
  is absent. [apply.sh:prepare_forms_lambda_package]
- Through the reviewed-apply wrapper, plans and applies this Terraform root,
  which creates or changes the AWS, GitHub and DNS resources described in
  `../EGM.md`. [apply.sh:Running bootstrap apply phase: full]
- Executes text produced by `scripts/terraform-outputs.mjs` in the current shell
  (`eval`). [apply.sh:eval "${recaptcha_env}"]

### `cloudfront_lookup.sh`

- Read-only AWS CLI calls: `aws cloudfront list-origin-access-controls`,
  `aws cloudfront list-functions` (up to twice per function name) and
  `aws cloudfront list-distributions` (once per alias). [cloudfront_lookup.sh:aws cloudfront list-origin-access-controls] [cloudfront_lookup.sh:aws cloudfront list-distributions]
- Reads stdin and writes one line to stdout. No files are written. [cloudfront_lookup.sh:input="$(cat)"]

### `deploy-forms-api.sh`

- Read-only AWS calls made in both dry-run and apply modes:
  `aws sts get-caller-identity` (twice), `aws sns get-topic-attributes`,
  `aws sns list-subscriptions-by-topic`, and
  `aws lambda get-function-configuration` per target. [deploy-forms-api.sh:aws sns list-subscriptions-by-topic] [deploy-forms-api.sh:aws lambda get-function-configuration]
- Local build in both modes: creates a temporary directory with `mktemp -d`,
  runs `npm ci` in `../lambdas/forms-api` (replacing its `node_modules`), writes
  `forms-api.zip` into the temporary directory, and deletes that directory on
  exit through a `trap`. [deploy-forms-api.sh:trap 'rm -rf "$BUILD_DIR"' EXIT]
- With `--apply` only, per target function: `aws lambda publish-version`,
  `aws lambda update-function-code --zip-file` and
  `aws lambda wait function-updated`. [deploy-forms-api.sh:aws lambda publish-version] [deploy-forms-api.sh:run aws lambda update-function-code]
- No Terraform, database, or SNS publish activity. [deploy-forms-api.sh:Terraform owns all Lambda configuration]

## Verification

- Run: `npm run test:infra` (includes `scripts/deploy-forms-api.test.mjs` and
  `scripts/terraform-read-failures.test.mjs`, which cover `deploy-forms-api.sh`
  and `cloudfront_lookup.sh`).
- Run: `npm test` for the full chain.
