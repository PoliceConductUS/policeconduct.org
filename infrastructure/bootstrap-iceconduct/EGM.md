# bootstrap-iceconduct

## Overview

A standalone Terraform root that manages the redirect infrastructure for one
source domain (default `iceconduct.org`): a Route53 public hosted zone, two ACM
certificates in `us-east-1`, a CloudFront Function that answers every request
with a redirect, a CloudFront distribution that runs that function, and the DNS
alias records pointing at the distribution. It shares no resources or modules
with the other roots in `infrastructure/`. State lives in an S3 backend. Applies
go through the wrapper in [./scripts/EGM.md](./scripts/EGM.md).

## Interface

### Subdirectories

- [scripts](./scripts/EGM.md) — `apply.sh`, the guarded plan-review-apply
  wrapper for this root. `[scripts/apply.sh:terraform-reviewed-apply.sh]`

### Input variables (`variables.tf`)

- `aws_region` (string, default `us-east-1`) — region of the default `aws`
  provider. `[variables.tf:variable "aws_region"]`
- `domain_name` (string, default `iceconduct.org`) — redirect source apex
  domain. `[variables.tf:variable "domain_name"]`
- `redirect_target_url` (string, default the `https://www.policeconduct.org/`
  federal ICE agency page) — absolute destination URL; validation requires an
  `https://` prefix. `[variables.tf:redirect_target_url must be an absolute https URL.]`
- `project_name` (string, default `iceconduct-redirect`) — prefix for the
  CloudFront Function name and distribution comment.
  `[variables.tf:variable "project_name"]`
- `price_class` (string, default `PriceClass_100`) — validation allows only
  `PriceClass_All`, `PriceClass_200`, `PriceClass_100`.
  `[variables.tf:price_class must be one of: PriceClass_All, PriceClass_200, PriceClass_100.]`
- `tags` (map(string), default `ManagedBy`, `Project`, `Stack`) — default tags
  for both providers. `[variables.tf:variable "tags"]`

### Tracked inputs (`iceconduct.auto.tfvars`)

- Sets `aws_region`, `domain_name`, `redirect_target_url`, `project_name`,
  `price_class`, and `tags`; the tracked `tags` add `Environment = "production"`
  and `Repository` to the variable defaults.
  `[iceconduct.auto.tfvars:Environment = "production"]`

### Outputs (`outputs.tf`)

- `route53_zone_id` — hosted zone ID. `[outputs.tf:output "route53_zone_id"]`
- `route53_name_servers` — nameservers to set at the registrar.
  `[outputs.tf:output "route53_name_servers"]`
- `acm_certificate_arn` — the certificate ARN read back from the distribution's
  viewer certificate. `[outputs.tf:viewer_certificate[0].acm_certificate_arn]`
- `cloudfront_distribution_id` — distribution ID.
  `[outputs.tf:output "cloudfront_distribution_id"]`
- `cloudfront_domain_name` — distribution hostname.
  `[outputs.tf:output "cloudfront_domain_name"]`

### Providers and backend

- Terraform `>= 1.11.0`, provider `hashicorp/aws` `>= 5.40.0`.
  `[versions.tf:required_version = ">= 1.11.0"]`
- Two `aws` provider configurations: the default (region `var.aws_region`) and
  alias `us_east_1` (fixed `us-east-1`), both applying `var.tags` as default
  tags. `[providers.tf:alias  = "us_east_1"]`
- Backend `s3`: key `bootstrap-iceconduct/terraform.tfstate`, region
  `us-east-1`, encrypted, native lock file, restricted to one AWS account ID.
  The bucket name embeds that account ID.
  `[backend.tf:key                 = "bootstrap-iceconduct/terraform.tfstate"]`

### Locals and data sources (`main.tf`)

- `local.www_domain` = `www.<domain_name>`. `[main.tf:www_domain                = "www.${var.domain_name}"]`
- `local.preview_domains` = `preview.<domain_name>` and
  `*.preview.<domain_name>`. `[main.tf:preview_domains           = ]`
- `local.domain_aliases` = apex, `www`, and both preview names.
  `[main.tf:domain_aliases            = concat(]`
- `local.cloudfront_hosted_zone_id` — the fixed CloudFront alias zone ID.
  `[main.tf:cloudfront_hosted_zone_id = "Z2FDTNDATAQYW2"]`
- `local.function_name` = `<project_name>-viewer-redirect`.
  `[main.tf:function_name             = "${var.project_name}-viewer-redirect"]`
- `data.aws_cloudfront_cache_policy.managed_caching_disabled` — looks up the
  AWS managed policy by name. `[main.tf:Managed-CachingDisabled]`

### Managed resources (`main.tf`)

- `aws_route53_zone.site` — public hosted zone for `var.domain_name`.
  `[main.tf:resource "aws_route53_zone" "site"]`
- `aws_acm_certificate.site` — DNS-validated certificate for the apex with `www`
  as a subject alternative name, via provider `aws.us_east_1`,
  `create_before_destroy`. `[main.tf:resource "aws_acm_certificate" "site"]`
- `aws_route53_record.acm_validation` — `for_each` over the non-wildcard
  validation options of `aws_acm_certificate.site`; TTL 60,
  `allow_overwrite = true`. `[main.tf:if !startswith(dvo.domain_name, "*.")]`
- `aws_acm_certificate_validation.site` — waits on those records.
  `[main.tf:resource "aws_acm_certificate_validation" "site"]`
- `aws_acm_certificate.preview_rollout` — DNS-validated certificate for the
  apex with `www` and both preview names as subject alternative names, via
  `aws.us_east_1`, `create_before_destroy`.
  `[main.tf:resource "aws_acm_certificate" "preview_rollout"]`
- `aws_route53_record.preview_rollout_validation` — one `CNAME` validation
  record selected for `preview.<domain_name>`; TTL 60,
  `allow_overwrite = false`.
  `[main.tf:resource "aws_route53_record" "preview_rollout_validation"]`
- `aws_acm_certificate_validation.preview_rollout` — waits on the
  `acm_validation` records plus the preview record.
  `[main.tf:resource "aws_acm_certificate_validation" "preview_rollout"]`
- `aws_cloudfront_function.redirect` — runtime `cloudfront-js-2.0`, published,
  inline code with `var.domain_name` and `var.redirect_target_url` embedded
  through `jsonencode`. `[main.tf:resource "aws_cloudfront_function" "redirect"]`
- `aws_cloudfront_distribution.redirect` — enabled, IPv6, `http2and3`, aliases
  `local.domain_aliases`, empty default root object, price class from
  `var.price_class`, one custom origin, the function attached at
  `viewer-request`. `[main.tf:resource "aws_cloudfront_distribution" "redirect"]`
- `aws_route53_record.apex_a` and `aws_route53_record.apex_aaaa` — alias `A`
  and `AAAA` records for the apex. `[main.tf:resource "aws_route53_record" "apex_aaaa"]`
- `aws_route53_record.www_a` and `aws_route53_record.www_aaaa` — alias `A` and
  `AAAA` records for `www`. `[main.tf:resource "aws_route53_record" "www_aaaa"]`
- `aws_route53_record.preview_a` and `aws_route53_record.preview_aaaa` —
  `for_each` over `local.preview_domains`, alias `A` and `AAAA` records.
  `[main.tf:resource "aws_route53_record" "preview_aaaa"]`

### Redirect function contract (`aws_cloudfront_function.redirect`)

- `handler(event)` returns status `400` `Bad Request` when the lowercased `Host`
  header is neither the source domain nor a subdomain of it.
  `[main.tf:if (host !== source && !host.endsWith(suffix)) {]`
- Otherwise returns `301` `Moved Permanently`. `[main.tf:statusCode: 301,]`
- Target host: the request host with the source domain suffix replaced by the
  target URL's host with any leading `www.` removed, so each source host maps to
  the same-named host on the target domain.
  `[main.tf:var targetHost = host.slice(0, host.length - source.length) + targetDomain;]`
- Path: a request for `/` uses the path of `redirect_target_url`; any other
  request keeps its own URI. `[main.tf:var path = request.uri === '/' ? targetParts[2] : request.uri;]`
- Query string: every key and value, including multi-value entries, is appended
  as `key=value` joined by `&`. `[main.tf:var values = entry.multiValue || [entry];]`
- Response header `cache-control: public, max-age=3600`.
  `[main.tf:'cache-control': { value: 'public, max-age=3600' }]`

### Callers

- `scripts/terraform-tracked-inputs.test.mjs` scans every `infrastructure/`
  directory that has a `variables.tf`, including this one.
  `[../../scripts/terraform-tracked-inputs.test.mjs:existsSync(join(dir, "variables.tf"))]`
- No root `package.json` script and no other root applies or reads outputs from
  this stack. `[../../scripts/bootstrap-all.sh:bash infrastructure/bootstrap-recaptcha/scripts/apply.sh]`

## Invariants

- The distribution serves the `preview_rollout` certificate, not
  `aws_acm_certificate.site`; `site` and its validation remain declared.
  `[main.tf:acm_certificate_arn      = aws_acm_certificate_validation.preview_rollout.certificate_arn]`
- Both certificates are created through the `us_east_1` provider alias.
  `[main.tf:provider = aws.us_east_1]`
- The origin is a placeholder (`example.com`, HTTPS only, TLSv1.2) that is not
  expected to be reached because the viewer-request function always returns a
  response. `[main.tf:The viewer-request function returns before origin access.]`
- Viewer policy is `redirect-to-https`; allowed and cached methods are `GET`
  and `HEAD`; minimum TLS is `TLSv1.2_2021` with SNI only.
  `[main.tf:minimum_protocol_version = "TLSv1.2_2021"]`
- Response compression is enabled on the default cache behavior.
  `[main.tf:compress               = true]`
- Geo restriction is a whitelist containing only `US`.
  `[main.tf:locations        = ["US"]]`
- Caching uses the managed `Managed-CachingDisabled` policy.
  `[main.tf:cache_policy_id        = data.aws_cloudfront_cache_policy.managed_caching_disabled.id]`
- `redirect_target_url` must start with `https://`; the function additionally
  assumes it has a path beginning with `/` after the host.
  `[main.tf:var targetParts = target.match(/^https:\/\/([^/]+)(\/.*)$/);]`
- The backend refuses any AWS account other than the one listed.
  `[backend.tf:allowed_account_ids]`
- Tracked inputs live in `iceconduct.auto.tfvars` and must not assign a
  sensitive variable. `[iceconduct.auto.tfvars:Secrets never go here]`
- State must already exist before an apply through the wrapper.
  `[scripts/apply.sh:require-terraform-state.sh]`

## Side Effects

- Plan and apply call AWS APIs for Route53 (zone and records), ACM in
  `us-east-1` (two certificates and their validations), and CloudFront (function,
  distribution, cache policy lookup). `[main.tf:resource "aws_cloudfront_distribution" "redirect"]`
- Creates public DNS records: `A`/`AAAA` aliases for the apex, `www`,
  `preview`, and `*.preview`, plus ACM validation records.
  `[main.tf:resource "aws_route53_record" "preview_a"]`
- `aws_route53_record.acm_validation` may overwrite an existing record of the
  same name and type. `[main.tf:allow_overwrite = true]`
- Reads and writes Terraform state and its lock file in the S3 backend.
  `[backend.tf:use_lockfile        = true]`
- All taggable resources receive `var.tags`. `[providers.tf:tags = var.tags]`
- Public effect once deployed: every request to the source hosts receives a
  `301` to the target host, or a `400` for an unexpected host.
  `[main.tf:statusDescription: 'Moved Permanently',]`
- No file in this directory is written by Terraform configuration; there are no
  `local_file`, provisioner, or `external` blocks.
  `[versions.tf:source  = "hashicorp/aws"]`

## Verification

- Run: `npm run test:infra`
- The redirect function is tested by `scripts/redirect.test.mjs`, which no root
  `package.json` script runs; run it with
  `node --test infrastructure/bootstrap-iceconduct/scripts/redirect.test.mjs`.
  `[scripts/redirect.test.mjs:maps only the hostname for]`
