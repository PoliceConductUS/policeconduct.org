# intake-workspace

## Overview

A standalone Terraform root, written as a single `main.tf`, that owns one private
S3 bucket for intake workspace data and three IAM operator roles (`dev`,
`preview`, `production`), each limited to its own top-level prefix in that
bucket. The file declares no backend block, so Terraform uses local state in
this directory. The repository's workspace push and pull scripts read the bucket
name from this root's outputs. The `tests/` subdirectory holds a Terraform test
file and is not documented here.

## Interface

### Input variables (`main.tf`)

- `bucket_name` (string, default `null`) — when null the name is
  `policeconduct-intake-workspace-<caller account ID>`; validation allows only a
  3 to 63 character lowercase name of letters, digits, and hyphens.
  `[main.tf:Use a plain lowercase bucket name without dots or paths.]`
- `role_prefix` (string, default `policeconduct-intake-workspace`) — prefix of
  the three role names. `[main.tf:variable "role_prefix"]`
- `operator_principals` (list(string), default `null`) — IAM principals trusted
  to assume the roles; when null, the caller account root. Validation requires a
  non-empty list of account-root, role, or user ARNs.
  `[main.tf:Supply explicit IAM principal ARNs for workspace operators.]`

### Outputs (`main.tf`)

- `bucket_name` — bucket ID. `[main.tf:output "bucket_name"]`
- `bucket_arn` — bucket ARN built from the name. `[main.tf:output "bucket_arn"]`
- `workspace_prefixes` — map of environment to `s3://<bucket>/<environment>/`.
  `[main.tf:output "workspace_prefixes"]`
- `operator_policies` — map of environment to the role policy document object.
  `[main.tf:output "operator_policies"]`
- `operator_role_arns` — map of environment to role ARN.
  `[main.tf:output "operator_role_arns"]`
- `intake_workspace_bucket_name` — bucket ID, same value as `bucket_name`; this
  is the output the workspace scripts read.
  `[main.tf:output "intake_workspace_bucket_name"]`

### Provider

- Terraform `>= 1.7.0`, provider `hashicorp/aws` `~> 6.0`.
  `[main.tf:required_version = ">= 1.7.0"]`
- `aws` provider fixed to region `us-east-1` with default tags `Project`,
  `Environment = "shared"`, `Stack = "intake-workspace"`, `Repository`,
  `ManagedBy`. `[main.tf:Stack       = "intake-workspace"]`

### Locals and data sources

- `data.aws_caller_identity.current` — supplies the account ID for defaults.
  `[main.tf:data "aws_caller_identity" "current" {}]`
- `local.bucket_name`, `local.operator_principals` — variable values or their
  account-derived defaults. `[main.tf:bucket_name         = coalesce(]`
- `local.operator_roles` — map `dev`, `preview`, `production` to
  `<role_prefix>-<environment>`. `[main.tf:operator_roles      = ]`
- `local.bucket_arn`. `[main.tf:bucket_arn          = "arn:aws:s3:::${local.bucket_name}"]`
- `local.policies` — one IAM policy document per environment (see Invariants).
  `[main.tf:policies = { for environment, role in local.operator_roles : environment => {]`

### Managed resources

- `aws_s3_bucket.workspace` — `force_destroy = false`, tag
  `Purpose = "intake-workspace"`, `prevent_destroy`.
  `[main.tf:resource "aws_s3_bucket" "workspace"]`
- `aws_s3_bucket_versioning.workspace` — status `Enabled`, `prevent_destroy`.
  `[main.tf:resource "aws_s3_bucket_versioning" "workspace"]`
- `aws_s3_bucket_server_side_encryption_configuration.workspace` — `AES256`.
  `[main.tf:resource "aws_s3_bucket_server_side_encryption_configuration" "workspace"]`
- `aws_s3_bucket_public_access_block.workspace` — all four blocks true.
  `[main.tf:resource "aws_s3_bucket_public_access_block" "workspace"]`
- `aws_s3_bucket_ownership_controls.workspace` — `BucketOwnerEnforced`.
  `[main.tf:resource "aws_s3_bucket_ownership_controls" "workspace"]`
- `aws_s3_bucket_policy.workspace` — three deny statements (see Invariants).
  `[main.tf:resource "aws_s3_bucket_policy" "workspace"]`
- `aws_iam_role.workspace` — `for_each` over `local.operator_roles`; trust
  policy allows `sts:AssumeRole` from `local.operator_principals`.
  `[main.tf:resource "aws_iam_role" "workspace"]`
- `aws_iam_role_policy.workspace` — `for_each` over `local.operator_roles`;
  inline policy named `intake-workspace-<environment>`.
  `[main.tf:resource "aws_iam_role_policy" "workspace"]`

### Callers

- `scripts/workspace-operator.mjs` (root scripts `workspace:push` and
  `workspace:pull`) runs `terraform output -raw intake_workspace_bucket_name`
  with `-chdir` set to the absolute path of this directory when the
  `INTAKE_WORKSPACE_BUCKET` environment variable is not set.
  `[../../scripts/workspace-operator.mjs:"intake_workspace_bucket_name",]`
- The same script refuses a bucket whose four public access block settings are
  not all true or whose default encryption is not `AES256`, the settings this
  root applies. `[../../scripts/workspace-operator.mjs:Bucket default encryption must be AES256]`
- `runWorkspace` in `scripts/intake-workspace-sync.mjs`, which the operator
  script calls, refuses a bucket whose versioning is not `Enabled` or that is
  not tagged `Purpose=intake-workspace`, the tag this root sets, before it
  transfers anything.
  `[../../scripts/intake-workspace-sync.mjs:Workspace bucket versioning must be Enabled]`
  `[../../scripts/intake-workspace-sync.mjs:Bucket is not tagged Purpose=intake-workspace; refusing possible hosting bucket]`
- No apply wrapper exists for this root; nothing in the repository runs
  `terraform plan` or `terraform apply` against it.
  `[../../package.json:scripts/workspace-operator.mjs push]`

## Invariants

- The bucket and its versioning configuration cannot be destroyed by Terraform,
  and the bucket is never force-emptied.
  `[main.tf:lifecycle { prevent_destroy = true }]`
- Versioning is enabled. `[main.tf:versioning_configuration { status = "Enabled" }]`
- The bucket is private: every public access block setting is true and object
  ownership is bucket-owner enforced.
  `[main.tf:restrict_public_buckets = true]`
- Bucket policy `RequireTLS`: denies every S3 action to everyone when the
  request is not over TLS. `[main.tf:Sid = "RequireTLS"]`
- Bucket policy `NeverServeThroughCloudFront`: denies every S3 action to the
  CloudFront service principal. `[main.tf:Sid = "NeverServeThroughCloudFront"]`
- Bucket policy `RetainAllVersions`: denies `s3:DeleteObject`,
  `s3:DeleteObjectVersion`, and `s3:PutLifecycleConfiguration` to everyone.
  `[main.tf:Sid = "RetainAllVersions"]`
- Each operator role may read bucket versioning, tagging, public access block,
  and encryption settings. `[main.tf:"s3:GetEncryptionConfiguration"]`
- Each operator role may list the bucket only under its own
  `<environment>/*` prefix. `[main.tf:StringLike = { "s3:prefix" = ]`
- Each operator role may get, get-version, put, abort multipart uploads, and
  list multipart parts only under `<environment>/*`.
  `[main.tf:Resource = ["${local.bucket_arn}/${environment}/*"]`
- Each operator role is explicitly denied object deletion, version deletion,
  lifecycle changes, versioning changes, and bucket deletion.
  `[main.tf:"s3:PutBucketVersioning", "s3:DeleteBucket"]`
- Each operator role is explicitly denied object access under the other two
  environment prefixes. `[main.tf:if other != environment]`
- The environment set is fixed to `dev`, `preview`, `production`.
  `[main.tf:for env in ]`
- Local state and plan files and `*.local.tf` files are git-ignored.
  `[.gitignore:*.local.tf]`

## Side Effects

- Plan and apply call AWS STS `GetCallerIdentity`, S3 (bucket, versioning,
  encryption, public access block, ownership controls, bucket policy), and IAM
  (three roles and three inline role policies).
  `[main.tf:for_each           = local.operator_roles]`
- Creates IAM roles that the trusted principals can assume; by default that is
  the whole caller account. `[main.tf:Action = "sts:AssumeRole"]`
- Writes local Terraform state in this directory, because no backend is
  configured. `[.gitignore:*.tfstate]`
- All resources receive the provider default tags.
  `[main.tf:ManagedBy   = "Terraform"]`
- No file is written by the Terraform configuration itself; it declares no
  provisioner, `local_file`, or `external` block.
  `[main.tf:source  = "hashicorp/aws"]`

## Verification

- Run: `npm run test:infra`
- `tests/storage.tftest.hcl` plans this root against a mock `aws` provider and
  asserts the versioning, deletion, public access and prefix rules; no root
  `package.json` script runs it. Run it with
  `terraform -chdir=infrastructure/intake-workspace test`.
  `[tests/storage.tftest.hcl:mock_provider "aws" {}]`
