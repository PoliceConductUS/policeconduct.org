# submission-notifications

## Overview

A standalone Terraform root that manages the staff notification path for form
submissions: one SNS topic, its access policy, one email subscription per
recipient, and an S3 event notification on each of two existing submissions
buckets (production and preview) that publishes to the topic when an object is
created under `submissions/status/`. The buckets are looked up, not created.
State lives in an S3 backend. There is no apply wrapper in this directory.
`README.md` and `DESIGN.md` here are hand-written notes.

## Interface

### Input variables (`variables.tf`)

- `aws_region` (string, default `us-east-1`) — provider region.
  `[variables.tf:variable "aws_region"]`
- `aws_account_id` (string, default one fixed AWS account ID) — the account the
  caller is expected to be in. `[variables.tf:variable "aws_account_id"]`
- `project_name` (string, default `policeconduct`) — topic name prefix.
  `[variables.tf:variable "project_name"]`
- `submission_notification_recipients` (list(string), no default, required) —
  email addresses to subscribe; validation requires at least one non-blank
  entry.
  `[variables.tf:submission_notification_recipients must name at least one address.]`
- `submissions_bucket` (string, default the production submissions bucket name,
  which embeds the account ID). `[variables.tf:variable "submissions_bucket" {]`
- `submissions_bucket_preview` (string, default the preview submissions bucket
  name, which embeds the account ID).
  `[variables.tf:variable "submissions_bucket_preview"]`

### Tracked inputs (`submission-notifications.auto.tfvars`)

- Sets only `submission_notification_recipients`, to a single staff address.
  `[submission-notifications.auto.tfvars:submission_notification_recipients = ]`

### Outputs (`outputs.tf`)

- `submission_notifications_topic_arn` — ARN of the SNS topic.
  `[outputs.tf:output "submission_notifications_topic_arn"]`
- `verify_commands` — a multi-line string of three `aws` CLI commands (list the
  topic's subscriptions; read the notification configuration of the production
  and the preview submissions bucket) for an operator to run after apply. Terraform only prints them.
  `[outputs.tf:output "verify_commands"]`

### Provider and backend (`versions.tf`)

- Terraform `>= 1.11.0`, provider `hashicorp/aws` `~> 6.0`.
  `[versions.tf:version = "~> 6.0"]`
- Backend `s3`: key `submission-notifications/terraform.tfstate`, region
  `us-east-1`, encrypted, native lock file. The bucket name embeds an AWS
  account ID. The backend block sets no `allowed_account_ids`.
  `[versions.tf:key          = "submission-notifications/terraform.tfstate"]`
- `aws` provider: region `var.aws_region`, default tags `Project`,
  `Environment = "shared"`, `Stack = "submission-notifications"`, `Repository`,
  `ManagedBy`. `[versions.tf:Stack       = "submission-notifications"]`

### Locals, data sources, and checks (`main.tf`)

- `data.aws_caller_identity.current`. `[main.tf:data "aws_caller_identity" "current" {}]`
- `check.correct_account` — asserts the caller account equals
  `var.aws_account_id`. A failed check block assertion is reported as a warning
  and does not stop the plan or apply. `[main.tf:check "correct_account"]`
  `[main.tf:it does not stop the run.]`
- `data.aws_s3_bucket.submissions` — looks up `var.submissions_bucket`.
  `[main.tf:data "aws_s3_bucket" "submissions" {]`
- `data.aws_s3_bucket.submissions_preview` — looks up
  `var.submissions_bucket_preview`. `[main.tf:data "aws_s3_bucket" "submissions_preview"]`
- `local.recipients` — the recipient list trimmed, with blank entries removed
  and duplicates removed. `[main.tf:recipients = distinct(]`
- `data.aws_iam_policy_document.submission_notifications` — the topic policy
  (see Invariants). `[main.tf:data "aws_iam_policy_document" "submission_notifications"]`

### Managed resources (`main.tf`)

- `aws_sns_topic.submission_notifications` — name
  `<project_name>-submission-notifications`.
  `[main.tf:resource "aws_sns_topic" "submission_notifications"]`
- `aws_sns_topic_policy.submission_notifications`.
  `[main.tf:resource "aws_sns_topic_policy" "submission_notifications"]`
- `aws_sns_topic_subscription.submission_notifications` — `for_each` over
  `local.recipients`, protocol `email`.
  `[main.tf:resource "aws_sns_topic_subscription" "submission_notifications"]`
- `aws_s3_bucket_notification.submissions` — production bucket; one topic rule
  with id `submission-verified`, events `s3:ObjectCreated:*`, prefix
  `submissions/status/`. `[main.tf:resource "aws_s3_bucket_notification" "submissions" {]`
- `aws_s3_bucket_notification.submissions_preview` — preview bucket; the same
  rule. `[main.tf:resource "aws_s3_bucket_notification" "submissions_preview"]`

### Callers

- `infrastructure/bootstrap-policeconduct` takes this root's topic ARN as its
  `submission_notifications_topic_arn` input variable; the value is passed by
  the operator, not read automatically.
  `[../bootstrap-policeconduct/variables.tf:variable "submission_notifications_topic_arn"]`
- `infrastructure/bootstrap-policeconduct/scripts/deploy-forms-api.sh` requires
  the same ARN as `--topic-arn`.
  `[../bootstrap-policeconduct/scripts/deploy-forms-api.sh:submission_notifications_topic_arn output of infrastructure/submission-notifications]`
- `scripts/terraform-tracked-inputs.test.mjs` scans this directory's
  `variables.tf` and `*.auto.tfvars`.
  `[../../scripts/terraform-tracked-inputs.test.mjs:existsSync(join(dir, "variables.tf"))]`
- No script in the repository plans or applies this root, and
  `scripts/terraform-outputs.mjs` does not read its outputs.
  `[../../scripts/terraform-outputs.mjs:const policeconduct = "bootstrap-policeconduct";]`

## Invariants

- At least one non-blank recipient is required; there is no default.
  `[variables.tf:trimspace(e) != ""]) > 0]`
- The caller's AWS account is compared with `var.aws_account_id` in a `check`
  block. `[main.tf:Check AWS_PROFILE.]`
- The topic policy keeps an account-owner statement
  (`AllowAccountOwnerManagement`) granting the account root the SNS management
  and publish actions. `[main.tf:sid    = "AllowAccountOwnerManagement"]`
- The topic policy statement `AllowSubmissionsBucketPublish` lets the S3
  service publish only when the source ARN is one of the two submissions buckets
  and the source account is the caller account.
  `[main.tf:sid       = "AllowSubmissionsBucketPublish"]`
- Both bucket notifications fire only for objects created under
  `submissions/status/`. `[main.tf:filter_prefix = "submissions/status/"]`
- Both bucket notifications are created after the topic policy.
  `[main.tf:depends_on = [aws_sns_topic_policy.submission_notifications]`
- The two submissions buckets are referenced as data sources and never created
  or deleted here. `[variables.tf:Referenced, never created here.]`
- This root declares no scheduled monitor, Lambda, alarm, or IAM role.
  `[main.tf:Verified-submission notifications. No scheduled monitoring.]`
- Tracked inputs must not hold secrets.
  `[submission-notifications.auto.tfvars:Secrets never go here]`
- `.terraform.lock.hcl` is tracked on purpose; `.terraform/`, `.build/`, state,
  and plan files are git-ignored. `[.gitignore:.terraform.lock.hcl is deliberately NOT ignored]`

## Side Effects

- Plan and apply call AWS STS `GetCallerIdentity`, S3 (read both buckets, put
  their notification configuration), and SNS (topic, topic policy,
  subscriptions). `[main.tf:bucket = data.aws_s3_bucket.submissions.id]`
- Writes the notification configuration of both existing submissions buckets,
  declaring a single topic rule, `submission-verified`, on each.
  `[main.tf:id            = "submission-verified"]`
- Creating an email subscription makes SNS send a confirmation email to that
  address; the subscription delivers nothing until a person confirms it.
  `[main.tf:An unconfirmed subscription receives nothing]`
- Once deployed, each object created under `submissions/status/` in either
  bucket causes an SNS publish, which emails every confirmed recipient.
  `[main.tf:events        = ]`
- Reads and writes Terraform state and its lock file in the S3 backend.
  `[versions.tf:use_lockfile = true]`
- All taggable resources receive the provider default tags.
  `[versions.tf:ManagedBy   = "Terraform"]`
- No file is written by the Terraform configuration itself; it declares no
  provisioner, `local_file`, or `external` block.
  `[versions.tf:source  = "hashicorp/aws"]`

## Verification

- Run: `npm run test:infra`
