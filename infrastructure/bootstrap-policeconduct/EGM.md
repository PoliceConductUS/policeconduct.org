# bootstrap-policeconduct

## Overview

The Terraform root that owns the AWS, DNS and GitHub foundation for the site:
the remote-state bucket, the production and preview static-site buckets and
CloudFront distributions, the edge router, the Forms API Lambdas with their
encrypted draft and submission buckets, the release API, the WAF rate limits,
SES sending identity, alarms, the GitHub Actions OIDC role and environment
variables, and the account-wide security services (GuardDuty, Security Hub,
Inspector).

A hand-written operator guide lives in [README.md](./README.md). This file is
the machine-checkable contract: what the root takes in, what it puts out, what
must stay true, and what it changes.

Files in this directory:

| File                                                     | Role                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `versions.tf`, `providers.tf`                            | Terraform and provider version pins; default, `us_east_1` and GitHub providers |
| `backend.tf`                                             | S3 remote-state backend                                                        |
| `variables.tf`, `policeconduct.auto.tfvars`              | Input variables and the committed non-secret values                            |
| `main.tf`                                                | Locals and most resources                                                      |
| `release.tf`                                             | Release-data buckets, release API Lambda, `intake_news` role, three outputs    |
| `preview-entrypoints.tf`                                 | Preview certificate and validation record, bare `preview.` DNS records, pages  |
| `existing-dns.tf`                                        | Adopted Google mail and domain-verification DNS records                        |
| `logs.tf`                                                | Adopted Lambda log groups                                                      |
| `github-repository-settings.tf`                          | Pull-request merge settings for a fixed list of repositories                   |
| `account-security.tf.json`                               | GuardDuty detectors, Security Hub and Inspector in 17 regions                  |
| `guardduty-features.tf.json`                             | GuardDuty detector features per region                                         |
| `outputs.tf`                                             | Outputs                                                                        |
| `create-bootstrap-user.sh`, `bootstrap-user-policy.json` | Helper that creates an IAM user with an inline IAM, S3 and STS policy          |
| `.terraform.lock.hcl`                                    | Provider lockfile                                                              |

Callers: `scripts/apply.sh` (see [scripts](./scripts/EGM.md)), which the repo
root `scripts/bootstrap-all.sh` runs; the repo root `scripts/terraform-outputs.mjs`
reads this root's outputs by the name `bootstrap-policeconduct`.

## Interface

### Subdirectories

- [functions](./functions/EGM.md): the shared CloudFront viewer-request router
  (`router.js`) and the preview-only `noindex` viewer-response function.
- [lambdas](./lambdas/EGM.md): the Forms API Lambda
  ([forms-api](./lambdas/forms-api/EGM.md)) and the release API Lambda
  ([release-api](./lambdas/release-api/EGM.md)).
- [scripts](./scripts/EGM.md): `apply.sh`, `cloudfront_lookup.sh` and
  `deploy-forms-api.sh`.
- `preview-pages/`: static HTML uploaded by `aws_s3_object.preview_entrypoint`
  (no contract file). [preview-entrypoints.tf:preview-pages]

### Versions, providers and backend

- Terraform `>= 1.11.0`; providers `hashicorp/aws` pinned to `= 6.73.0`,
  `hashicorp/external >= 2.3.0`, `hashicorp/archive >= 2.5.0`,
  `hashicorp/random >= 3.6.0`, `integrations/github >= 6.0.0`. [versions.tf:required_version = ">= 1.11.0"] [versions.tf:= 6.73.0]
- Providers: default `aws` in `var.aws_region` with `default_tags` from
  `var.tags`; `aws.us_east_1` (used for ACM and the CloudFront-scope WAF) with
  the same default tags; `aws.existing_logs` in `us-east-1` without default
  tags; `github` with `owner = var.github_org`. [providers.tf:us_east_1] [logs.tf:existing_logs] [providers.tf:owner = var.github_org]
- Seventeen more `aws` provider aliases named `security_<region>`, one per
  region, each restricted with `allowed_account_ids`. [account-security.tf.json:security_us_east_1]
- Backend: S3, key `bootstrap-policeconduct/terraform.tfstate`, region
  `us-east-1`, encrypted, S3 lockfile locking, restricted to one account. The
  bucket name embeds that account's ID. [backend.tf:use_lockfile] [backend.tf:allowed_account_ids]

### Input variables (`variables.tf`)

Naming and identity:

- `project_name` (string, default `policeconduct`): prefix for resource names. [variables.tf:variable "project_name"]
- `aws_region` (string, default `us-east-1`). [variables.tf:variable "aws_region"]
- `domain_name` (string, default `policeconduct.org`): apex domain. [variables.tf:variable "domain_name"]
- `tags` (map(string), default `ManagedBy`, `Project`, `Stack`): default tags. [variables.tf:variable "tags"]
- `github_org` (string, has a default), `github_repo` (string, default
  `policeconduct.org`): repository trusted by the OIDC role and targeted by the
  GitHub provider resources. [variables.tf:variable "github_org"] [variables.tf:variable "github_repo"]
- `role_name` (string, default `policeconduct-github-actions`). [variables.tf:variable "role_name"]
- `existing_oidc_provider_arn` (string, default null): reuse an existing GitHub
  OIDC provider; null creates one. [variables.tf:variable "existing_oidc_provider_arn"]
- `github_oidc_thumbprints` (list(string), default one SHA-1 thumbprint). [variables.tf:variable "github_oidc_thumbprints"]

Buckets (each name defaults to null, which derives
`<project_name>-<purpose>-<account id>`; each `*_force_destroy` defaults to
`false`):

- `bucket_name` and `site_bucket_force_destroy`: production site bucket. [variables.tf:variable "bucket_name"] [variables.tf:variable "site_bucket_force_destroy"]
- `enable_site_bucket_versioning` (bool, default `true`). [variables.tf:variable "enable_site_bucket_versioning"]
- `state_bucket_name`, `state_bucket_force_destroy`. [variables.tf:variable "state_bucket_name"] [variables.tf:variable "state_bucket_force_destroy"]
- `preview_bucket_name`, `preview_bucket_force_destroy`. [variables.tf:variable "preview_bucket_name"] [variables.tf:variable "preview_bucket_force_destroy"]
- `forms_drafts_bucket_name`, `forms_drafts_bucket_force_destroy`. [variables.tf:variable "forms_drafts_bucket_name"] [variables.tf:variable "forms_drafts_bucket_force_destroy"]
- `forms_submissions_bucket_name`, `forms_submissions_bucket_force_destroy`. [variables.tf:variable "forms_submissions_bucket_name"] [variables.tf:variable "forms_submissions_bucket_force_destroy"]
- `forms_drafts_preview_bucket_name`,
  `forms_drafts_preview_bucket_force_destroy`. [variables.tf:variable "forms_drafts_preview_bucket_name"] [variables.tf:variable "forms_drafts_preview_bucket_force_destroy"]
- `forms_submissions_preview_bucket_name`,
  `forms_submissions_preview_bucket_force_destroy`. [variables.tf:variable "forms_submissions_preview_bucket_name"] [variables.tf:variable "forms_submissions_preview_bucket_force_destroy"]

Forms API:

- `lambda_nodejs_runtime` (string, default `nodejs24.x`). [variables.tf:variable "lambda_nodejs_runtime"]
- `forms_draft_active_window_seconds` (number, default `3600`). [variables.tf:variable "forms_draft_active_window_seconds"]
- `forms_draft_max_bytes` (number, default `1048576`). [variables.tf:variable "forms_draft_max_bytes"]
- `forms_readonly_role_name` (string, default null, derives
  `<project_name>-forms-readonly`). [variables.tf:variable "forms_readonly_role_name"]
- `forms_readonly_role_assume_principals` (list(string), default `[]`, which
  means the account root). [variables.tf:variable "forms_readonly_role_assume_principals"]
- `forms_email_verification_from_address` (string, default a no-reply address
  on the mail subdomain). [variables.tf:variable "forms_email_verification_from_address"]
- `forms_email_resend_api_key_production`, `forms_email_resend_api_key_preview`
  (string, default null, sensitive): email provider API key per environment. [variables.tf:variable "forms_email_resend_api_key_production"] [variables.tf:variable "forms_email_resend_api_key_preview"]
- `forms_email_verification_domain` (string, default `mail.policeconduct.org`). [variables.tf:variable "forms_email_verification_domain"]
- `forms_email_mail_from_subdomain` (string, default `bounce`). [variables.tf:variable "forms_email_mail_from_subdomain"]
- `forms_email_dmarc_policy` (string, default `none`, not validated). [variables.tf:variable "forms_email_dmarc_policy"]
- `forms_email_dmarc_aggregate_report_address` (string, default null). [variables.tf:variable "forms_email_dmarc_aggregate_report_address"]
- `forms_email_verification_ttl_seconds` (number, default `900`). [variables.tf:variable "forms_email_verification_ttl_seconds"]
- `submission_notifications_topic_arn` (string, default empty): ARN of the
  topic owned by the separate `infrastructure/submission-notifications` stack;
  empty means no publish grant. [variables.tf:variable "submission_notifications_topic_arn"]
- `submission_notification_email_endpoints` (list(string), default `[]`): staff
  recipients passed to the Lambdas. [variables.tf:variable "submission_notification_email_endpoints"]

reCAPTCHA (the first five are required, with no default):

- `recaptcha_project_id`. [variables.tf:variable "recaptcha_project_id"]
- `recaptcha_site_key`. [variables.tf:variable "recaptcha_site_key"]
- `recaptcha_service_account_email`. [variables.tf:variable "recaptcha_service_account_email"]
- `recaptcha_wif_provider_resource_name`. [variables.tf:variable "recaptcha_wif_provider_resource_name"]
- `recaptcha_wif_audience`. [variables.tf:variable "recaptcha_wif_audience"]
- `recaptcha_min_score` (number, default `0.5`, not range-checked). [variables.tf:variable "recaptcha_min_score"]

Rate limits and alarms:

- `site_rate_limit_per_5m` (number, default `3000`). [variables.tf:variable "site_rate_limit_per_5m"]
- `forms_api_rate_limit_per_5m` (number, default `500`). [variables.tf:variable "forms_api_rate_limit_per_5m"]
- `rate_limit_retry_after_seconds` (number, default `300`). [variables.tf:variable "rate_limit_retry_after_seconds"]
- `forms_api_alarm_5xx_threshold` (number, default `10`): threshold for the
  Lambda `Errors` alarms. [variables.tf:variable "forms_api_alarm_5xx_threshold"]
- `forms_api_alarm_latency_p95_ms_threshold` (number, default `2000`). [variables.tf:variable "forms_api_alarm_latency_p95_ms_threshold"]
- `forms_lambda_alarm_throttles_threshold` (number, default `1`). [variables.tf:variable "forms_lambda_alarm_throttles_threshold"]
- `alarm_actions` (list(string), default `[]`). [variables.tf:variable "alarm_actions"]
- `alert_topic_name` (string, default null, derives `<project_name>-alerts`). [variables.tf:variable "alert_topic_name"]
- `alert_email_endpoints` (list(string), default `[]`). [variables.tf:variable "alert_email_endpoints"]

Site, DNS and CDN:

- `hosted_zone_id` (string, default null): reuse a zone; null creates one. [variables.tf:variable "hosted_zone_id"]
- `www_record_mode` (string, default `alias`; one of `alias`, `cname`, `none`). [variables.tf:variable "www_record_mode"]
- `price_class` (string, default `PriceClass_100`). [variables.tf:variable "price_class"]
- `waf_web_acl_arn` (string, default null): overrides the stack's own web ACL
  on both distributions. [variables.tf:variable "waf_web_acl_arn"]
- `extra_dns_records` (list of objects with `name`, `type`, optional `ttl`,
  optional `records`, optional `alias`; default `[]`). [variables.tf:variable "extra_dns_records"]

Analytics and error reporting (all string, default null):

- `ga_measurement_id_production`, `ga_measurement_id_preview`. [variables.tf:variable "ga_measurement_id_production"] [variables.tf:variable "ga_measurement_id_preview"]
- `sentry_dsn_production`, `sentry_dsn_preview`. [variables.tf:variable "sentry_dsn_production"] [variables.tf:variable "sentry_dsn_preview"]
- `sentry_org`, `sentry_project`. [variables.tf:variable "sentry_org"] [variables.tf:variable "sentry_project"]
- `sentry_auth_token` (sensitive). [variables.tf:variable "sentry_auth_token"]

`policeconduct.auto.tfvars` sets non-secret values for many of these on every
plan, including the tags, the OIDC provider ARN to reuse, the alert and
submission-notification recipients, and two `extra_dns_records` entries (apex
MX and TXT). It holds no secrets. [policeconduct.auto.tfvars:Secrets never go here]

### Outputs

From `outputs.tf` (none is marked sensitive):

- `aws_role_arn`, `aws_role_name`: the GitHub Actions role. [outputs.tf:output "aws_role_arn"] [outputs.tf:output "aws_role_name"]
- `oidc_provider_arn`. [outputs.tf:output "oidc_provider_arn"]
- `state_bucket_name`, `site_bucket_name`, `preview_bucket_name`,
  `site_bucket_names_effective`. [outputs.tf:output "state_bucket_name"] [outputs.tf:output "site_bucket_name"] [outputs.tf:output "preview_bucket_name"] [outputs.tf:output "site_bucket_names_effective"]
- `cloudfront_distribution_id`, `cloudfront_domain_name`,
  `preview_cloudfront_distribution_id`, `preview_cloudfront_domain_name`. [outputs.tf:output "cloudfront_distribution_id"] [outputs.tf:output "cloudfront_domain_name"] [outputs.tf:output "preview_cloudfront_distribution_id"] [outputs.tf:output "preview_cloudfront_domain_name"]
- `acm_certificate_arn`, `acm_validation_records_by_domain`,
  `acm_validation_records_unmanaged`. [outputs.tf:output "acm_certificate_arn"] [outputs.tf:output "acm_validation_records_by_domain"] [outputs.tf:output "acm_validation_records_unmanaged"]
- `route53_zone_id`, `route53_name_servers` (empty list when the zone is
  reused). [outputs.tf:output "route53_zone_id"] [outputs.tf:output "route53_name_servers"]
- `site_url`, `www_url` (null when `www` is off). [outputs.tf:output "site_url"] [outputs.tf:output "www_url"]
- `forms_api_url` (the constant `/api`), `forms_api_function_url`,
  `forms_api_preview_function_url`. [outputs.tf:output "forms_api_url"] [outputs.tf:output "forms_api_function_url"] [outputs.tf:output "forms_api_preview_function_url"]
- `recaptcha_site_key`, `recaptcha_project_id`. [outputs.tf:output "recaptcha_site_key"] [outputs.tf:output "recaptcha_project_id"]
- `forms_drafts_bucket_name`, `forms_submissions_bucket_name`,
  `forms_drafts_preview_bucket_name`, `forms_submissions_preview_bucket_name`. [outputs.tf:output "forms_drafts_bucket_name"] [outputs.tf:output "forms_submissions_bucket_name"] [outputs.tf:output "forms_drafts_preview_bucket_name"] [outputs.tf:output "forms_submissions_preview_bucket_name"]
- `forms_drafts_kms_key_arn`, `forms_submissions_kms_key_arn`. [outputs.tf:output "forms_drafts_kms_key_arn"] [outputs.tf:output "forms_submissions_kms_key_arn"]
- `forms_readonly_role_arn`, `forms_readonly_role_name`. [outputs.tf:output "forms_readonly_role_arn"] [outputs.tf:output "forms_readonly_role_name"]
- `forms_api_waf_web_acl_arn`. [outputs.tf:output "forms_api_waf_web_acl_arn"]
- `alert_topic_arn` (null when no alert endpoint is configured). [outputs.tf:output "alert_topic_arn"]
- `submission_notifications_enabled` (bool). [outputs.tf:output "submission_notifications_enabled"]
- `site_redirects_kvs_arn`, `preview_redirects_kvs_arn`. [outputs.tf:output "site_redirects_kvs_arn"] [outputs.tf:output "preview_redirects_kvs_arn"]
- `sentry_org`, `sentry_project`. [outputs.tf:output "sentry_org"] [outputs.tf:output "sentry_project"]

From `release.tf`:

- `release_data_bucket_name`, `preview_release_data_bucket_name`. [release.tf:output "release_data_bucket_name"] [release.tf:output "preview_release_data_bucket_name"]
- `intake_news_configuration`: map with `AWS_ROLE_ARN`, `AWS_REGION`,
  `NEWS_RELEASE_FUNCTION`, `NEWS_PRIVATE_BUCKET`, `NEWS_SITE_BUCKET`,
  `NEWS_DISTRIBUTION_ID`. [release.tf:output "intake_news_configuration"]

### Resources, grouped by type

Storage and encryption:

- `aws_s3_bucket`: `terraform_state`, `site`, `preview`, `forms_drafts`,
  `forms_submissions`, `forms_drafts_preview`, `forms_submissions_preview`
  (`main.tf`), and `release_data` for keys `prod` and `preview` (`release.tf`),
  named `<project_name>-<key>-release-<account id>` with no name variable. [release.tf:-release-] [main.tf:resource "aws_s3_bucket" "terraform_state"] [main.tf:resource "aws_s3_bucket" "site"] [release.tf:resource "aws_s3_bucket" "release_data"]
- Each `main.tf` bucket has `aws_s3_bucket_public_access_block`,
  `aws_s3_bucket_ownership_controls`, `aws_s3_bucket_versioning` and
  `aws_s3_bucket_server_side_encryption_configuration` (AES256 for state, site
  and preview; `aws:kms` for the four forms buckets). The `release_data`
  buckets (`release.tf`) have the same four resources, with versioning enabled
  and AES256 encryption, plus a TLS-only bucket policy
  (`aws_s3_bucket_policy.release_data_tls_only`, a `DenyInsecureTransport`
  statement like the state bucket's). [main.tf:resource "aws_s3_bucket_server_side_encryption_configuration" "forms_drafts"] [release.tf:resource "aws_s3_bucket_public_access_block" "release_data"] [release.tf:resource "aws_s3_bucket_versioning" "release_data"] [release.tf:resource "aws_s3_bucket_ownership_controls" "release_data"] [release.tf:resource "aws_s3_bucket_server_side_encryption_configuration" "release_data"] [release.tf:resource "aws_s3_bucket_policy" "release_data_tls_only"]
- `aws_s3_bucket_lifecycle_configuration.preview`: rule
  `expire-noncurrent-preview-versions` (noncurrent versions expire after 7
  days; expired object delete markers are removed; incomplete multipart uploads
  abort after 7 days). [main.tf:expire-noncurrent-preview-versions] [main.tf:expired_object_delete_marker = true]
- `aws_s3_bucket_policy`: `terraform_state_tls_only`, `forms_drafts`,
  `forms_submissions`, `forms_drafts_preview`, `forms_submissions_preview`,
  `site`, `preview`. [main.tf:resource "aws_s3_bucket_policy" "terraform_state_tls_only"] [main.tf:resource "aws_s3_bucket_policy" "preview"]
- `aws_kms_key` and `aws_kms_alias`: `forms_drafts`, `forms_submissions`,
  `forms_drafts_preview`, `forms_submissions_preview`, with key rotation on. [main.tf:resource "aws_kms_key" "forms_drafts_preview"] [main.tf:enable_key_rotation]
- `aws_s3_object.preview_entrypoint`: `index.html`, `pr-13/index.html` and
  `404.html` in the preview bucket. [preview-entrypoints.tf:resource "aws_s3_object" "preview_entrypoint"]

Compute:

- `aws_lambda_function.forms_api_prod` and `forms_api_preview`: handler
  `index.handler`, timeout 10 s, memory 1024 MB, both from
  `data.archive_file.forms_api_lambda`. [main.tf:resource "aws_lambda_function" "forms_api_prod"] [main.tf:resource "aws_lambda_function" "forms_api_preview"]
- Environment variables set on both functions: `RELEASE_DATA_BUCKET`,
  `DRAFTS_BUCKET`, `DRAFTS_KMS_KEY_ID`, `DRAFTS_PREFIX`, `SUBMISSIONS_BUCKET`,
  `SUBMISSIONS_KMS_KEY_ID`, `SUBMISSIONS_PREFIX`, `RECAPTCHA_PROJECT_ID`,
  `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`,
  `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`, `RECAPTCHA_WIF_AUDIENCE`,
  `RECAPTCHA_MIN_SCORE`, `DRAFT_ACTIVE_WINDOW_MS`, `MAX_DRAFT_BYTES`,
  `EMAIL_VERIFICATION_FROM_ADDRESS`, `RESEND_API_KEY`,
  `EMAIL_VERIFICATION_HMAC_SECRET`, `EMAIL_VERIFICATION_TTL_SECONDS`,
  `SUBMISSIONS_VERIFY_PREFIX`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`,
  `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`, `SUBMISSION_NOTIFICATION_RECIPIENTS`.
  The preview function also gets `NOTIFICATION_ENV_LABEL`. [main.tf:SUBMISSIONS_VERIFY_PREFIX] [main.tf:NOTIFICATION_ENV_LABEL]
- `aws_lambda_function_url` and `aws_lambda_permission` for both forms
  functions (authorization type `NONE`). [main.tf:resource "aws_lambda_function_url" "forms_api_prod"] [main.tf:AllowPublicInvokeViaFunctionUrlPreview]
- `aws_lambda_function.release_api`: timeout 30 s, environment `KVS_ARN`,
  `RELEASE_DATA_BUCKET`, `S3_BUCKET`, `CLOUDFRONT_DIST_ID`; no Function URL. [release.tf:resource "aws_lambda_function" "release_api"]
- `random_password.forms_email_verification_hmac_secret` (64 characters, shared
  by both forms functions). [main.tf:resource "random_password" "forms_email_verification_hmac_secret"]
- `aws_cloudwatch_log_group.existing_lambda`: the two forms API log groups and
  a retired canary's log group, adopted by import. [logs.tf:resource "aws_cloudwatch_log_group" "existing_lambda"]

Identity:

- `aws_iam_role` and inline `aws_iam_role_policy`: `forms_lambda`,
  `forms_lambda_preview`, `forms_readonly`, `github_actions`, `release_api`,
  `intake_news`; plus `aws_iam_role_policy_attachment.release_api_logs`. [main.tf:resource "aws_iam_role" "forms_lambda_preview"] [main.tf:resource "aws_iam_role" "github_actions"] [release.tf:resource "aws_iam_role" "intake_news"] [release.tf:release_api_logs]
- `aws_iam_openid_connect_provider.github` (only when no existing provider ARN
  is supplied). [main.tf:resource "aws_iam_openid_connect_provider" "github"]
- `github_actions` policy statements: `S3CreateBucket`, `StateBucketAccess`,
  `DeploymentBucketsAccess`, `CloudFrontAccess`,
  `CloudFrontKeyValueStorePreviewAccess`, `AcmAccess`, `Route53Access`,
  `WafReadAccess`. [main.tf:CloudFrontKeyValueStorePreviewAccess] [main.tf:WafReadAccess]
- `intake_news` trust: GitHub OIDC, subject limited to the `intake`
  repository's `main` branch. [release.tf:/intake:ref:refs/heads/main]
- `release_api` role policy: KeyValueStore `GetKey`, `DescribeKeyValueStore`
  and `UpdateKeys` on the production `site_redirects` store, `s3:GetObject` on
  `*/override/*` in the site bucket, and `cloudfront:CreateInvalidation` on the
  production distribution. [release.tf:cloudfront-keyvaluestore:UpdateKeys] [release.tf:cloudfront:CreateInvalidation]
- `intake_news` role policy: `lambda:InvokeFunction` on the release API,
  `s3:ListBucket` on the site and production release-data buckets,
  `s3:GetObject` on `*/build/*` and `*/override/*` in the site bucket and on
  `builds/*/data/*` and `com/serpapi/landing-page-search/*` in the production
  release-data bucket, `s3:PutObject` on `*/override/*` in the site bucket and
  on the same two release-data paths (with an explicit deny for
  `builds/*/data/dynamic.json`), and `cloudfront:GetInvalidation` on the
  production distribution. [release.tf:lambda:InvokeFunction] [release.tf:com/serpapi/landing-page-search] [release.tf:actions = ["s3:PutObject"]] [release.tf:cloudfront:GetInvalidation]

Edge and network:

- `aws_cloudfront_distribution.site` and `preview`: an S3 origin through the
  shared origin access control and a Forms API Function URL origin for
  `/api/*`; 403 and 404 map to `/404.html`; geo restriction whitelist `US`.
  The default behavior allows only `GET` and `HEAD` with the managed
  `CachingOptimized` cache policy; `/api/*` allows every method with the managed
  `CachingDisabled` cache policy. [main.tf:Managed-CachingDisabled] [main.tf:resource "aws_cloudfront_distribution" "site"] [main.tf:resource "aws_cloudfront_distribution" "preview"] [main.tf:path_pattern]
- `aws_cloudfront_function`: `index_rewrite` and `preview_router` (both the
  rendered `functions/router.js`), and `preview_noindex`. [main.tf:shared_router_code] [main.tf:resource "aws_cloudfront_function" "preview_noindex"]
- `aws_cloudfront_key_value_store`: `site_redirects`, `preview_redirects`. [main.tf:resource "aws_cloudfront_key_value_store" "site_redirects"] [main.tf:resource "aws_cloudfront_key_value_store" "preview_redirects"]
- `aws_cloudfront_origin_access_control.site` and
  `aws_cloudfront_response_headers_policy.site_security_headers` (CSP,
  Permissions-Policy, HSTS, frame, referrer, content-type-options,
  `Cross-Origin-Opener-Policy` and `X-Permitted-Cross-Domain-Policies`
  headers), shared by both distributions. [main.tf:Cross-Origin-Opener-Policy] [main.tf:X-Permitted-Cross-Domain-Policies] [main.tf:resource "aws_cloudfront_origin_access_control" "site"] [main.tf:resource "aws_cloudfront_response_headers_policy" "site_security_headers"]
- `aws_wafv2_web_acl.forms_api_cloudfront`: rules `RateLimitSitePerIp` and
  `RateLimitApiPerIp` (requests under `/api/`), both answering 429 with a
  `Retry-After` header set from `rate_limit_retry_after_seconds`. [main.tf:value = tostring(var.rate_limit_retry_after_seconds)] [main.tf:RateLimitSitePerIp] [main.tf:RateLimitApiPerIp]
- `aws_acm_certificate` and `aws_acm_certificate_validation`: `site`
  (`main.tf`) and `preview` (`preview-entrypoints.tf`). The `site` certificate
  covers the apex and, when `www_record_mode` is not `none`, `www.`; it lists no
  preview name. The `preview` certificate covers `preview.<domain>` and
  `*.preview.<domain>`. [main.tf:resource "aws_acm_certificate" "site"] [preview-entrypoints.tf:resource "aws_acm_certificate" "preview"] [main.tf:local.include_www ? [local.www_domain] : []]
- `aws_route53_zone.site` (only when no zone id is supplied). [main.tf:resource "aws_route53_zone" "site"]
- `aws_route53_record`: `apex_a`, `apex_aaaa`, `www_alias_a`, `www_alias_aaaa`,
  `www_cname`, `preview_wildcard_a`, `preview_wildcard_aaaa`, `acm_validation`,
  `resend_domain_record`, `ses_domain_identity_verification`, `ses_domain_dkim`,
  `ses_mail_from_mx`, `ses_mail_from_spf`, `ses_dmarc`, `extra_standard`,
  `extra_alias` (`main.tf`); `preview_root` and `preview_acm_validation`
  (`preview-entrypoints.tf`); `google_mail_dmarc`, `google_mail_dkim`,
  `google_domain_verification` (`existing-dns.tf`). [main.tf:resource "aws_route53_record" "extra_standard"] [preview-entrypoints.tf:resource "aws_route53_record" "preview_root"] [existing-dns.tf:resource "aws_route53_record" "google_domain_verification"]
- `aws_route53_record.preview_acm_validation` is the one validation record ACM
  gives `preview.<domain>` and `*.preview.<domain>`. A `moved` block carries it
  over from `acm_validation["*.preview.policeconduct.org"]`, where it lived while
  the site certificate listed the wildcard. [preview-entrypoints.tf:resource "aws_route53_record" "preview_acm_validation"] [preview-entrypoints.tf:from = aws_route53_record.acm_validation["*.preview.policeconduct.org"]]

Email:

- `aws_ses_domain_identity.site`, `aws_ses_domain_identity_verification.site`,
  `aws_ses_domain_dkim.site`, `aws_ses_domain_mail_from.site`. [main.tf:resource "aws_ses_domain_mail_from" "site"]
- `aws_sesv2_account_vdm_attributes.site`,
  `aws_sesv2_configuration_set.verification_email`, and
  `aws_sesv2_configuration_set_event_destination.verification_email_eventbridge`. [main.tf:resource "aws_sesv2_account_vdm_attributes" "site"] [main.tf:verification_email_eventbridge]

Monitoring:

- `aws_sns_topic.infrastructure_alerts` and
  `aws_sns_topic_subscription.infrastructure_alert_emails` (only when an alert
  address is configured). [main.tf:resource "aws_sns_topic" "infrastructure_alerts"] [main.tf:infrastructure_alert_emails]
- `aws_cloudwatch_metric_alarm`, for prod and preview each: `_errors`,
  `_duration_p95`, `_throttles`, `_verification_email_failed`,
  `_verification_email_not_sent`, and `_notify_failed` with one instance per
  key of `local.forms_notify_failure_alarms`. [main.tf:resource "aws_cloudwatch_metric_alarm" "forms_api_prod_errors"] [main.tf:forms_api_preview_verification_email_not_sent] [main.tf:resource "aws_cloudwatch_metric_alarm" "forms_api_preview_notify_failed"]
- `aws_cloudwatch_log_metric_filter`, for prod and preview each, matching the
  Forms API log messages `forms.submit.verification_email_failed` and
  `forms.submit.verification_email_not_sent`, and (`_notify_failed`) the
  error-level staff notification messages `forms.notify.nobody_told`,
  `forms.notify.publish_failed`, `forms.notify.email_failed`,
  `forms.notify.email_misconfigured` and `forms.notify.receipt_failed`. Every
  one of these filters and alarms uses the function's `/aws/lambda/` log group,
  the `<project_name>/FormsApi` namespace, a 300-second `Sum` of at least 1,
  missing data as not breaching, and `local.effective_alarm_actions` for alarm
  and OK. The warn-level `forms.notify.topic_not_configured` and
  `forms.notify.recipients_not_configured` have no alarm; when they leave
  nobody told, `forms.notify.nobody_told` is logged. [main.tf:forms.submit.verification_email_failed] [main.tf:forms.submit.verification_email_not_sent] [main.tf:forms_notify_failure_alarms = {] [main.tf:local.effective_alarm_actions]

GitHub:

- `github_repository_environment.environments` (`production`, `preview`). [main.tf:resource "github_repository_environment" "environments"]
- `github_actions_environment_variable.environment_variables`: `AWS_ROLE_ARN`,
  `S3_BUCKET`, `CLOUDFRONT_DIST_ID`, `FORMS_API_URL`, and when their inputs are
  set `GA_MEASUREMENT_ID`, `PUBLIC_SENTRY_DSN`, `PUBLIC_SENTRY_ENVIRONMENT`,
  `RECAPTCHA_SITE_KEY`, and for production only `SENTRY_ORG` and
  `SENTRY_PROJECT`. [main.tf:github_environment_variable_bindings] [main.tf:PUBLIC_SENTRY_ENVIRONMENT]
- `github_actions_environment_variable.preview_kvs_arn` (`KVS_ARN_PREVIEW`). [main.tf:KVS_ARN_PREVIEW]
- `github_actions_environment_secret.sentry_auth_token` (production only, when
  a token is supplied). [main.tf:resource "github_actions_environment_secret" "sentry_auth_token"]
- `github_repository.merge_policy` for a fixed set of repositories: squash
  merge on, merge commits and rebase merges off, delete branch on merge. [github-repository-settings.tf:resource "github_repository" "merge_policy"]

Account security (`*.tf.json`, one resource per region in 17 regions):

- `aws_guardduty_detector` (enabled, `SIX_HOURS` finding frequency). [account-security.tf.json:SIX_HOURS]
- `aws_securityhub_account` and two `aws_securityhub_standards_subscription`
  per region (CIS AWS Foundations Benchmark v1.2.0 and AWS Foundational
  Security Best Practices v1.0.0). [account-security.tf.json:aws_securityhub_standards_subscription] [account-security.tf.json:aws-foundational-security-best-practices/v/1.0.0]
- `aws_inspector2_enabler` (`EC2`, `ECR`, `LAMBDA` everywhere; `LAMBDA_CODE`
  and `CODE_REPOSITORY` in some regions). [account-security.tf.json:aws_inspector2_enabler] [account-security.tf.json:CODE_REPOSITORY]
- `aws_guardduty_detector_feature`: `S3_DATA_EVENTS`, `EKS_AUDIT_LOGS`,
  `EBS_MALWARE_PROTECTION`, `LAMBDA_NETWORK_LOGS`, `RDS_LOGIN_EVENTS` and
  `RUNTIME_MONITORING` enabled; `EKS_RUNTIME_MONITORING`, `AI_PROTECTION` and
  (where present) `AI_ANALYST` disabled. [guardduty-features.tf.json:aws_guardduty_detector_feature] [guardduty-features.tf.json:RUNTIME_MONITORING]

### `create-bootstrap-user.sh`

Run by an operator with admin-capable AWS credentials; nothing in the repo
calls it.

- Positional arguments, all optional: `$1` IAM user name (default
  `policeconduct-bootstrap-user`), `$2` inline policy name (default
  `policeconduct-bootstrap-user-inline`), `$3` local AWS profile name used only
  in the printed instructions (default `policeconduct-bootstrap`). [create-bootstrap-user.sh:USER_NAME="${1:-policeconduct-bootstrap-user}"] [create-bootstrap-user.sh:PROFILE_NAME="${3:-policeconduct-bootstrap}"]
- Exit codes: 1 when `bootstrap-user-policy.json` is missing or the user
  already has two access keys; 1 when `aws iam create-access-key` fails,
  because it runs in a process substitution and `read` then fails; otherwise
  the status of the failing `aws` command; 0 on success. [create-bootstrap-user.sh:Policy file not found] [create-bootstrap-user.sh:User already has 2 access keys] [create-bootstrap-user.sh:read -r ACCESS_KEY_ID SECRET_ACCESS_KEY < <(]
- `bootstrap-user-policy.json`: statements `BootstrapIam`,
  `BootstrapS3StateBucket` and `BootstrapReadIdentity`, all on resource `*`.
  They grant only IAM OIDC-provider and role actions, S3 bucket and object
  actions, and `sts:GetCallerIdentity`; they do not cover the CloudFront,
  Lambda, KMS, Route 53, ACM, WAF, SES, SNS, CloudWatch or security-service
  resources this root manages. [bootstrap-user-policy.json:BootstrapS3StateBucket] [bootstrap-user-policy.json:iam:CreateOpenIDConnectProvider] [bootstrap-user-policy.json:sts:GetCallerIdentity]
- The script's header and printed next steps say the same: the user cannot run
  this stack, which is applied with the setup admin profile that
  `infrastructure/README.md` describes. [create-bootstrap-user.sh:It cannot run the Terraform bootstrap stack] [create-bootstrap-user.sh:This user cannot apply the bootstrap stack.] [../README.md:policeconduct-setup-admin]

## Invariants

- The AWS provider version is pinned exactly; the lockfile must agree. [versions.tf:= 6.73.0]
- State lives only in the S3 backend, in one allowed account, with lockfile
  locking. [backend.tf:allowed_account_ids]
- Every security-region provider is restricted to one account, so a plan with
  credentials for another account fails. [account-security.tf.json:allowed_account_ids]
- The five required reCAPTCHA variables reject blank values, and
  `recaptcha_site_key` rejects placeholder values. [variables.tf:recaptcha_site_key must be an actual key value, not a placeholder.]
- `www_record_mode` and `price_class` accept only their listed values. [variables.tf:www_record_mode must be one of: alias, cname, none.] [variables.tf:price_class must be one of]
- Each `extra_dns_records` item defines either `records` or `alias`, never
  both, and alias items must be type `A` or `AAAA`. [variables.tf:Each extra_dns_records item must define either records (non-empty) or alias, but not both.] [variables.tf:Alias entries in extra_dns_records must use record type A or AAAA.]
- `extra_dns_records` must not repeat a record that `existing-dns.tf` adopts;
  a precondition on `aws_route53_record.extra_standard` fails the plan. [main.tf:which existing-dns.tf already manages] [existing-dns.tf:adopted_dns_record_keys]
- Sensitive inputs are exactly `sentry_auth_token` and the two email provider
  API keys. Secrets never go in `policeconduct.auto.tfvars`. [variables.tf:sensitive] [policeconduct.auto.tfvars:Secrets never go here]
- Every bucket in `main.tf` and `release.tf` blocks all public access and
  enforces bucket-owner object ownership. [main.tf:BucketOwnerEnforced] [release.tf:BucketOwnerEnforced]
- The state bucket, the four forms buckets and the two release-data buckets
  deny any request that is not over TLS. [main.tf:DenyInsecureTransport] [release.tf:DenyInsecureTransport]
- The forms buckets deny uploads that are not SSE-KMS or that use any key other
  than the bucket's own. [main.tf:DenyUnencryptedObjectUploads] [main.tf:DenyWrongKmsKey]
- Production and preview forms Lambdas have separate roles; neither can reach
  the other environment's buckets, keys or logs. [main.tf:The production and preview forms Lambdas each have their own role]
- The forms roles are named `<project_name>-forms-lambda` and
  `<project_name>-forms-lambda-preview`. The `bootstrap-recaptcha` workload
  identity provider admits only the roles that its `aws_forms_lambda_role_name`
  and `aws_forms_lambda_preview_role_name` variables name (defaults
  `policeconduct-forms-lambda` and `policeconduct-forms-lambda-preview`), so a
  change to either role name must be made in both roots. [main.tf:"${var.project_name}-forms-lambda-preview"] [../bootstrap-recaptcha/variables.tf:variable "aws_forms_lambda_preview_role_name"] [../bootstrap-recaptcha/main.tf:Only the forms Lambda roles may exchange AWS credentials in this pool.]
- Neither forms Lambda role can delete objects; `s3:ListBucket` is granted only
  on that environment's release-data bucket. [main.tf:DistinguishMissingFormReleases]
- Each forms Lambda gets its own environment's email API key. [main.tf:forms_email_resend_api_key_preview]
- `ses:SendEmail` is allowed only from the configured sender address. [main.tf:ses:FromAddress]
- `sns:Publish` is granted to the forms roles only when
  `submission_notifications_topic_arn` is set, and only on that ARN. This root
  does not create or own that topic. [main.tf:PublishSubmissionNotifications] [main.tf:enable_submission_notifications]
- The Lambda zip contains only `index.mjs`, `package.json`,
  `native-domexception/**` and `node_modules/**`, matching
  `scripts/deploy-forms-api.sh`. [main.tf:native-domexception/**]
- The release API zip contains only `index.mjs`, `service.mjs`,
  `package.json` and `node_modules/**`. [release.tf:toset(["index.mjs", "service.mjs", "package.json"])]
- `forms_readonly` can list, read and decrypt submissions only; it has no
  access to drafts and no write access. [main.tf:DecryptSubmissionObjects]
- The site and preview bucket policies grant read access only to CloudFront,
  only for `*/build/*`, `*/override/*` and `404.html`, and only from that
  bucket's own distribution. Roles in the account also read these buckets
  through their own IAM policies: `github_actions` (both buckets), and
  `intake_news` and `release_api` (site bucket). [main.tf:AllowCloudFrontServicePrincipalReadOnly] [main.tf:AllowPreviewCloudFrontServicePrincipalReadOnly] [main.tf:DeploymentBucketsAccess] [release.tf:data "aws_iam_policy_document" "release_api"] [release.tf:data "aws_iam_policy_document" "intake_news"]
- Release-data buckets are never CloudFront origins. [release.tf:Page records and acquisition evidence are never CloudFront origins.]
- The release API has no Function URL; it is invoked through the Lambda API. [release.tf:There is no Function URL.]
- `intake_news` may write overrides and release data but is explicitly denied
  writing `builds/*/data/dynamic.json`. [release.tf:data/dynamic.json"]
- The GitHub Actions role may be assumed only with audience
  `sts.amazonaws.com` and a subject in the configured repository. [main.tf:GitHubActionsOidcAssumeRole] [main.tf:github_repo_sub]
- CI has KeyValueStore data access to the preview store only; the production
  store controls live-site routing and is excluded. [main.tf:CloudFrontKeyValueStorePreviewAccess]
- `KVS_ARN_PREVIEW` is published to GitHub only after the role policy that
  grants the store access exists. [main.tf:depends_on = [aws_iam_role_policy.github_actions_permissions]]
- The `noindex` function is attached only to the preview distribution. [main.tf:resource "aws_cloudfront_function" "preview_noindex"]
- One router template and one response headers policy serve both
  distributions, so a change to either affects production and preview
  together. [main.tf:shared_router_code]
- WAF rate-limit blocks answer 429, not 403, because the distributions map 403
  to `/404.html`. [main.tf:api_rate_limited]
- Both distributions redirect viewers to HTTPS, require TLS 1.2 or later, and
  serve only viewers in the `US` geo whitelist. [main.tf:TLSv1.2_2021] [main.tf:redirect-to-https]
- The site certificate is replaced create-before-destroy, so the production
  distribution moves to the new certificate before the old one is deleted. The
  preview distribution uses its own certificate, and the production certificate
  lists no preview name. [main.tf:create_before_destroy] [preview-entrypoints.tf:The production certificate does not list a]
- Records declared with `allow_overwrite = false` fail the apply (the Route 53
  create call) instead of taking over an existing record; the plan does not
  check for one. [preview-entrypoints.tf:allow_overwrite = false]
- Adopted DNS records, log groups, security services and repository merge
  settings are brought in with `import` blocks; their values match what was
  already live. The DNS import ids are built from `local.route53_zone_id` and
  `var.domain_name`. [existing-dns.tf:Existing public DNS records adopted] [existing-dns.tf:id = "${local.route53_zone_id}__dmarc.${var.domain_name}_TXT"] [logs.tf:import {]
- `github_repository.merge_policy` and every resource in the two `*.tf.json`
  files carry `prevent_destroy`; the repository resource ignores changes to
  every setting other than the four merge settings. [github-repository-settings.tf:prevent_destroy = true] [account-security.tf.json:prevent_destroy] [guardduty-features.tf.json:prevent_destroy]
- Security Hub default standards are off; only the two subscribed standards
  apply. [account-security.tf.json:enable_default_standards]
- Blank string inputs are treated like null for names, ids, DSNs and keys. [main.tf:provided_hosted_zone_id]
- `create-bootstrap-user.sh` never creates a third access key for a user. [create-bootstrap-user.sh:"${KEY_COUNT}" -ge 2]

## Side Effects

- Programs run at plan time through `data "external"`:
  `node ../../scripts/bootstrap-resend-domain.mjs --read` (it reads its API key
  from Parameter Store and calls the Resend API; its `records_json` result
  decides which email-provider DNS records are published) and
  `bash scripts/cloudfront_lookup.sh` (its result decides whether the origin
  access control, the two router functions and the two distributions are
  imported or created). [main.tf:bootstrap-resend-domain.mjs] [main.tf:cloudfront_lookup.sh] [../../scripts/bootstrap-resend-domain.mjs:https://api.resend.com] [../../scripts/bootstrap-resend-domain.mjs:"get-parameter",]
- Files written in this directory at plan or apply: `lambdas/forms-api.zip` and
  `lambdas/release-api.zip`. [main.tf:lambdas/forms-api.zip] [release.tf:lambdas/release-api.zip]
- AWS: creates or updates every resource listed under "Resources, grouped by
  type", in the default region, in `us-east-1` for ACM and WAF, and in 17
  regions for the security services. [main.tf:provider = aws.us_east_1] [account-security.tf.json:aws_guardduty_detector]
- A `*_force_destroy` variable set to `true` lets a destroy delete that
  bucket's contents. [main.tf:force_destroy = var.site_bucket_force_destroy]
- Secrets are placed in Lambda environment variables and in Terraform state:
  the email API key, the generated HMAC secret and the Sentry DSN. [main.tf:EMAIL_VERIFICATION_HMAC_SECRET] [main.tf:RESEND_API_KEY]
- The two Forms API Function URLs are publicly invocable. [main.tf:AllowPublicInvokeViaFunctionUrlProd]
- An empty `submission_notifications_topic_arn` sets
  `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` to empty on both forms Lambdas and
  removes their `sns:Publish` grant. `scripts/apply.sh` therefore sets
  `TF_VAR_submission_notifications_topic_arn` from the
  `infrastructure/submission-notifications` output and refuses to apply when
  that output is missing or empty, or when a value already set differs from it.
  `policeconduct.auto.tfvars` does not set it, so a `terraform apply` run
  outside `scripts/apply.sh` still gets the empty default unless the operator
  sets the variable. [main.tf:trimspace(var.submission_notifications_topic_arn)] [variables.tf:default only because this stack must still plan before the other one has] [scripts/apply.sh:resolve_submission_notifications_topic_arn]
- Public DNS: publishes the apex, optional `www`, `preview.` and `*.preview.`
  records, ACM validation records, SES and email-provider records, the adopted
  Google records and any `extra_dns_records`. [main.tf:preview_wildcard_domain] [preview-entrypoints.tf:preview_root]
- CloudFront Functions are created with `publish = true`, so a change to
  `functions/router.js` or `functions/noindex.js` goes live on apply. [main.tf:publish = true]
- Email: creating an alert subscription makes SNS send a confirmation email to
  each address; afterwards alarm and OK transitions notify them. [main.tf:effective_alarm_actions]
- SES: turns on Virtual Deliverability Manager account-wide and publishes
  send, reject, bounce, complaint, delivery, delivery-delay and
  rendering-failure events to the account's default EventBridge bus. [main.tf:vdm_enabled] [main.tf:matching_event_types]
- GitHub: creates the `production` and `preview` environments, writes their
  variables and the production `SENTRY_AUTH_TOKEN` secret, and sets merge
  settings on the listed repositories. [main.tf:SENTRY_AUTH_TOKEN] [github-repository-settings.tf:merge_policy_repositories]
- `create-bootstrap-user.sh` calls `aws sts get-caller-identity`,
  `aws iam get-user`, `aws iam create-user`, `aws iam put-user-policy`,
  `aws iam list-access-keys` and `aws iam create-access-key`, and prints the new
  access key id and secret to stdout once. It writes no files. [create-bootstrap-user.sh:aws iam create-access-key] [create-bootstrap-user.sh:aws iam put-user-policy]
- No database tables are touched anywhere in this root. [versions.tf:required_providers]

## Verification

- Run: `npm run test:infra` (covers `scripts/deploy-forms-api.sh`,
  `scripts/cloudfront_lookup.sh`, the Terraform state, destroy-approval,
  tracked-input and output helpers this root depends on).
- Run: `npm run test:lambda` (Forms API Lambda).
- Run: `npm run test:redirects` (CloudFront router and release API service).
- Run: `npm test` for the full chain.
