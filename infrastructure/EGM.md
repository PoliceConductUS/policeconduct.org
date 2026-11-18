# infrastructure Blueprint

## System Overview

`infrastructure/` holds the Terraform roots that own the cloud resources for PoliceConduct.org, each in its own directory with its own state. Three roots have a guarded `scripts/apply.sh` wrapper; two are applied with Terraform directly. The hand-written operator guide is [README.md](./README.md); this file indexes the code contracts.

Citations use the form `[path:text]`, where the path is relative to this directory and the text appears verbatim in that file.

## Subdirectories & System Boundaries

- bootstrap-policeconduct: [./bootstrap-policeconduct/EGM.md](./bootstrap-policeconduct/EGM.md) - Terraform root for the site's AWS, DNS and GitHub foundation: buckets, CloudFront distributions with the shared router and key-value stores, the forms and release Lambdas, WAF, SES, alarms, GitHub settings and account security services.
- bootstrap-iceconduct: [./bootstrap-iceconduct/EGM.md](./bootstrap-iceconduct/EGM.md) - Terraform root for the iceconduct.org redirect: a Route 53 zone, certificates, and a CloudFront distribution whose function redirects to the matching policeconduct.org host.
- bootstrap-recaptcha: [./bootstrap-recaptcha/EGM.md](./bootstrap-recaptcha/EGM.md) - Terraform root for Google Cloud reCAPTCHA Enterprise: site keys, an assessor service account, and a workload identity pool with an AWS provider.
- intake-workspace: [./intake-workspace/EGM.md](./intake-workspace/EGM.md) - Terraform root for the private, versioned intake workspace bucket and its three prefix-scoped operator roles.
- modules: [./modules/EGM.md](./modules/EGM.md) - Groups Terraform module directories; its one child holds no Terraform configuration.
- submission-notifications: [./submission-notifications/EGM.md](./submission-notifications/EGM.md) - Terraform root for staff submission notifications: an SNS topic, email subscriptions, and S3 event notifications on the existing submissions buckets.

## Global Invariants

- Each root keeps its own state. `bootstrap-policeconduct`, `bootstrap-iceconduct` and `bootstrap-recaptcha` use an S3 backend restricted to one account. `[bootstrap-policeconduct/backend.tf:allowed_account_ids]` `[bootstrap-iceconduct/backend.tf:allowed_account_ids]` `[bootstrap-recaptcha/backend.tf:allowed_account_ids]`
- `submission-notifications` uses an S3 backend with a lock file. `[submission-notifications/versions.tf:use_lockfile]`
- `intake-workspace` declares no backend and keeps local state in its own directory. `[intake-workspace/README.md:It has independent local Terraform state.]`
- The three `scripts/apply.sh` wrappers run `terraform plan` and `terraform apply` only through `scripts/terraform-reviewed-apply.sh` in the repository root, which applies the reviewed plan file. Before that, each wrapper reads the existing state with `terraform state pull` through `scripts/require-terraform-state.sh`. `[bootstrap-iceconduct/scripts/apply.sh:require-terraform-state.sh]` `[bootstrap-policeconduct/scripts/apply.sh:terraform-reviewed-apply.sh]` `[bootstrap-iceconduct/scripts/apply.sh:terraform-reviewed-apply.sh]` `[bootstrap-recaptcha/scripts/apply.sh:terraform-reviewed-apply.sh]`
- `bootstrap-policeconduct` takes its reCAPTCHA inputs from the `bootstrap-recaptcha` outputs and refuses to apply without them, so `bootstrap-recaptcha` is applied first. `[bootstrap-policeconduct/scripts/apply.sh:preflight_recaptcha_requirements]`
- `bootstrap-policeconduct/scripts/apply.sh` sources the repository `.env` file first, then runs the Parameter Store audit before it reads any secret from Parameter Store. `[bootstrap-policeconduct/scripts/apply.sh:audit-parameter-store.mjs]` `[bootstrap-policeconduct/scripts/apply.sh:load_parameter_store_secrets SENTRY_AUTH_TOKEN GITHUB_TOKEN]`
- The intake workspace bucket and its versioning cannot be destroyed by Terraform. `[intake-workspace/main.tf:prevent_destroy = true]`

## Global Side Effects

- Applying `bootstrap-policeconduct` changes the live site's CloudFront distributions, and its CloudFront Functions go live on apply. `[bootstrap-policeconduct/main.tf:resource "aws_cloudfront_distribution" "site"]` `[bootstrap-policeconduct/main.tf:publish = true]`
- Applying `bootstrap-iceconduct` changes the redirect distribution for iceconduct.org. `[bootstrap-iceconduct/main.tf:resource "aws_cloudfront_distribution" "redirect"]`
- Applying `bootstrap-recaptcha` changes Google Cloud resources, including the workload identity provider that the forms Lambda uses. `[bootstrap-recaptcha/main.tf:resource "google_iam_workload_identity_pool_provider" "aws"]`
- Applying `submission-notifications` writes the notification configuration of the existing submissions buckets, for objects created under one prefix. `[submission-notifications/main.tf:filter_prefix = "submissions/status/"]`
- `intake-workspace` publishes the bucket name that the workspace push and pull commands read. `[intake-workspace/main.tf:output "intake_workspace_bucket_name"]`

## System Verification

- Run: `npm run test:infra`
- Run: `npm run test:lambda` for the Lambda code under `bootstrap-policeconduct/lambdas/`.
- No root `package.json` script runs the `bootstrap-iceconduct` redirect function test or the `intake-workspace` Terraform test; run them directly with `node --test infrastructure/bootstrap-iceconduct/scripts/redirect.test.mjs` and `terraform -chdir=infrastructure/intake-workspace test`. `[bootstrap-iceconduct/scripts/redirect.test.mjs:maps only the hostname for]` `[intake-workspace/tests/storage.tftest.hcl:run "private_versioned_storage"]`
