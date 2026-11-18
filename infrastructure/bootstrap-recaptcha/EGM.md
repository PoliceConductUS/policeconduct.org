# bootstrap-recaptcha

## Overview

A standalone Terraform root that manages the Google Cloud reCAPTCHA Enterprise
resources used by the site's forms: the enabled API, two score-based web site
keys (one current, one imported legacy key), a Google service account for
assessments, and a Workload Identity Pool with an AWS provider so AWS principals
can impersonate that service account without a stored key. The only AWS call is
a caller-identity lookup that supplies the AWS account ID for the federation
trust. State lives in an S3 backend. Applies go through the wrapper in
[./scripts/EGM.md](./scripts/EGM.md).

## Interface

### Subdirectories

- [scripts](./scripts/EGM.md) — `apply.sh`, the guarded plan-review-apply
  wrapper for this root. `[scripts/apply.sh:terraform-reviewed-apply.sh]`

### Input variables (`variables.tf`)

- `aws_region` (string, default `us-east-1`) — region of the `aws` provider.
  `[variables.tf:variable "aws_region"]`
- `recaptcha_project_id` (string, default the one existing Google Cloud project
  ID) — validation rejects any other value.
  `[variables.tf:This existing stack is bound to Google project]`
- `service_account_account_id` (string, default `ipc-recaptcha-assessor`).
  `[variables.tf:variable "service_account_account_id"]`
- `service_account_display_name` (string, default
  `policeconduct reCAPTCHA assessor`).
  `[variables.tf:variable "service_account_display_name"]`
- `aws_forms_lambda_role_name` (string, default `policeconduct-forms-lambda`).
  `[variables.tf:variable "aws_forms_lambda_role_name"]`
- `workload_identity_pool_id` (string, default `policeconduct-aws-pool`).
  `[variables.tf:variable "workload_identity_pool_id"]`
- `workload_identity_pool_display_name` (string, default
  `PoliceConduct AWS Pool`).
  `[variables.tf:variable "workload_identity_pool_display_name"]`
- `workload_identity_provider_id` (string, default
  `policeconduct-aws-provider`).
  `[variables.tf:variable "workload_identity_provider_id"]`
- `workload_identity_provider_display_name` (string, default
  `PoliceConduct AWS Provider`).
  `[variables.tf:variable "workload_identity_provider_display_name"]`
- `recaptcha_key_display_name` (string, default `policeconduct-site`).
  `[variables.tf:variable "recaptcha_key_display_name"]`
- `allowed_domains` (list(string), default `www.policeconduct.org`,
  `policeconduct.org`, `localhost`, `127.0.0.1`) — validation requires at least
  one entry. `[variables.tf:allowed_domains must contain at least one domain.]`
- `labels` (map(string), default `managed_by`, `project`, `stack`) — labels on
  the current site key. `[variables.tf:variable "labels"]`
- `aws_tags` (map(string), default `ManagedBy`, `Project`, `Stack`) — default
  tags of the `aws` provider. `[variables.tf:variable "aws_tags"]`

### Tracked inputs (`recaptcha.auto.tfvars`)

- Sets `recaptcha_project_id`, `aws_region`, `allowed_domains`,
  `service_account_account_id`, `service_account_display_name`,
  `recaptcha_key_display_name`, and `aws_tags`; the tracked `aws_tags` add
  `Environment = "shared"` and `Repository` to the variable defaults.
  `[recaptcha.auto.tfvars:Environment = "shared"]`

### Outputs (`outputs.tf`)

- `recaptcha_project_id` — echoes `var.recaptcha_project_id`.
  `[outputs.tf:output "recaptcha_project_id"]`
- `recaptcha_site_key` — `local.site_key`, the last path segment of the current
  key's resource name. `[outputs.tf:output "recaptcha_site_key"]`
- `recaptcha_key_resource_name` — full resource name of the current key.
  `[outputs.tf:output "recaptcha_key_resource_name"]`
- `recaptcha_service_account_email` — email of the assessor service account.
  `[outputs.tf:output "recaptcha_service_account_email"]`
- `recaptcha_wif_provider_resource_name` — resource name of the AWS workload
  identity provider. `[outputs.tf:output "recaptcha_wif_provider_resource_name"]`
- `recaptcha_wif_audience` — `//iam.googleapis.com/` followed by the provider
  resource name. `[outputs.tf:output "recaptcha_wif_audience"]`

### Providers and backend

- Terraform `>= 1.11.0`; providers `hashicorp/aws`, `hashicorp/google`, and
  `hashicorp/google-beta`, each `>= 5.40.0`. `[versions.tf:google-beta = {]`
- `aws` provider: region `var.aws_region`, restricted to one AWS account ID,
  default tags `var.aws_tags`. `[providers.tf:tags = var.aws_tags]`
- `google` and `google-beta` providers: project `var.recaptcha_project_id`.
  `[providers.tf:provider "google-beta" {]`
- `google-beta` alias `legacy`: same project, with the Terraform attribution
  label turned off. `[legacy-key.tf:add_terraform_attribution_label = false]`
- Backend `s3`: key `bootstrap-recaptcha/terraform.tfstate`, region
  `us-east-1`, encrypted, native lock file, restricted to one AWS account ID.
  The bucket name embeds that account ID.
  `[backend.tf:key                 = "bootstrap-recaptcha/terraform.tfstate"]`

### Locals and data sources (`main.tf`)

- `local.required_services` — the set containing
  `recaptchaenterprise.googleapis.com`. `[main.tf:required_services = toset(]`
- `local.site_key` — last `/`-separated segment of
  `google_recaptcha_enterprise_key.site.name`.
  `[main.tf:reverse(split("/", google_recaptcha_enterprise_key.site.name)),]`
- `local.forms_lambda_role_arn` — an IAM role ARN built from the caller account
  and `var.aws_forms_lambda_role_name`. It is defined but not referenced by any
  resource or output in this root. `[main.tf:forms_lambda_role_arn = ]`
- `data.aws_caller_identity.current` — supplies the AWS account ID.
  `[main.tf:data "aws_caller_identity" "current" {}]`

### Managed resources

- `google_project_service.required` — `for_each` over
  `local.required_services`; `disable_on_destroy = false`.
  `[main.tf:resource "google_project_service" "required"]`
- `google_recaptcha_enterprise_key.site` — via `google-beta`; display name and
  labels from variables; web settings with integration type `SCORE` and
  `var.allowed_domains`. `[main.tf:resource "google_recaptcha_enterprise_key" "site"]`
- `google_service_account.recaptcha_assessor`.
  `[main.tf:resource "google_service_account" "recaptcha_assessor"]`
- `google_project_iam_member.recaptcha_assessor_role` — grants
  `roles/recaptchaenterprise.agent` on the project to the service account.
  `[main.tf:resource "google_project_iam_member" "recaptcha_assessor_role"]`
- `google_iam_workload_identity_pool.aws`.
  `[main.tf:resource "google_iam_workload_identity_pool" "aws"]`
- `google_iam_workload_identity_pool_provider.aws` — AWS provider block bound to
  the caller's AWS account ID.
  `[main.tf:resource "google_iam_workload_identity_pool_provider" "aws"]`
- `google_service_account_iam_member.recaptcha_assessor_wif_user` — grants
  `roles/iam.workloadIdentityUser` on the service account to every principal in
  the pool. `[main.tf:resource "google_service_account_iam_member" "recaptcha_assessor_wif_user"]`
- `google_service_account_iam_member.recaptcha_assessor_token_creator` — grants
  `roles/iam.serviceAccountTokenCreator` on the service account to every
  principal in the pool.
  `[main.tf:resource "google_service_account_iam_member" "recaptcha_assessor_token_creator"]`
- `google_recaptcha_enterprise_key.legacy_site` — via `google-beta.legacy`;
  display name `PoliceConduct.org`, no labels, integration type `SCORE`, one
  allowed domain, `allow_all_domains` and `allow_amp_traffic` false.
  `[legacy-key.tf:resource "google_recaptcha_enterprise_key" "legacy_site"]`
- `import` block — adopts an existing key, identified by its full resource
  name, into `google_recaptcha_enterprise_key.legacy_site`.
  `[legacy-key.tf:to = google_recaptcha_enterprise_key.legacy_site]`

### Callers

- `scripts/bootstrap-all.sh` applies this stack first through
  `scripts/apply.sh`.
  `[../../scripts/bootstrap-all.sh:bash infrastructure/bootstrap-recaptcha/scripts/apply.sh]`
- `scripts/terraform-outputs.mjs` maps five outputs of this stack to
  environment names: `RECAPTCHA_SITE_KEY`, `RECAPTCHA_PROJECT_ID`,
  `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`, `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`,
  `RECAPTCHA_WIF_AUDIENCE`. `recaptcha_key_resource_name` is not mapped.
  `[../../scripts/terraform-outputs.mjs:const recaptcha = "bootstrap-recaptcha";]`
- `infrastructure/bootstrap-policeconduct/scripts/apply.sh` copies those
  environment values into `TF_VAR_recaptcha_*` inputs.
  `[../bootstrap-policeconduct/scripts/apply.sh:the bootstrap-recaptcha Terraform outputs]`
- `scripts/terraform-tracked-inputs.test.mjs` scans this directory's
  `variables.tf` and `*.auto.tfvars`.
  `[../../scripts/terraform-tracked-inputs.test.mjs:existsSync(join(dir, "variables.tf"))]`

## Invariants

- The stack is bound to one Google project: `recaptcha_project_id` validation
  fails for any other value. `[variables.tf:condition     = var.recaptcha_project_id == ]`
- The stack is bound to one AWS account in both the provider and the backend.
  `[providers.tf:allowed_account_ids]`
- The legacy key cannot be destroyed by Terraform.
  `[legacy-key.tf:prevent_destroy = true]`
- Destroying the stack does not disable the reCAPTCHA Enterprise API.
  `[main.tf:disable_on_destroy = false]`
- Both keys are score-based web keys. `[main.tf:integration_type = "SCORE"]`
- `allowed_domains` must not be empty. `[variables.tf:length(var.allowed_domains) > 0]`
- The current key is created only after the API is enabled.
  `[main.tf:depends_on = [google_project_service.required]`
- Both service-account IAM grants wait for the project role grant and the pool
  provider. `[main.tf:google_iam_workload_identity_pool_provider.aws,]`
- Both service-account IAM grants name the whole pool (`/*`), not a single AWS
  role. `[main.tf:principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/*]`
- Tracked inputs live in `recaptcha.auto.tfvars` and must not hold secrets.
  `[recaptcha.auto.tfvars:Secrets never go here]`
- State must already exist before an apply through the wrapper.
  `[scripts/apply.sh:require-terraform-state.sh]`

## Side Effects

- Plan and apply call Google Cloud APIs: Service Usage (enable the API),
  reCAPTCHA Enterprise (two keys), IAM (service account, workload identity pool
  and provider, service-account IAM members), and Resource Manager (project IAM
  member). `[main.tf:service = each.value]`
- Changes project-level IAM by adding one member binding for the assessor
  service account. `[main.tf:role    = "roles/recaptchaenterprise.agent"]`
- Lets every principal in the AWS workload identity pool impersonate and mint
  tokens for the assessor service account.
  `[main.tf:role               = "roles/iam.serviceAccountTokenCreator"]`
- Calls AWS STS `GetCallerIdentity`; creates no AWS resources.
  `[main.tf:account_id = data.aws_caller_identity.current.account_id]`
- The first apply of the `import` block brings an existing Google key under
  Terraform management without recreating it. `[legacy-key.tf:import {]`
- Reads and writes Terraform state and its lock file in the S3 backend.
  `[backend.tf:use_lockfile        = true]`
- No file in this directory is written by the Terraform configuration; it
  declares no provisioner, `local_file`, or `external` block.
  `[versions.tf:source  = "hashicorp/google-beta"]`

## Verification

- Run: `npm run test:infra`
