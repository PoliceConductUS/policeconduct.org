variable "project_name" {
  description = "Short project identifier used in resource names."
  type        = string
  default     = "policeconduct"
}

variable "aws_region" {
  description = "AWS region for bootstrap resources."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain for the site."
  type        = string
  default     = "policeconduct.org"
}

variable "bucket_name" {
  description = "Name of the private S3 bucket that stores site assets. If null, defaults to <project_name>-site-<account_id>."
  type        = string
  default     = null
}

variable "public_ga_measurement_id_production" {
  description = "GA4 Measurement ID for production builds (example: G-XXXXXXXXXX). Leave null/empty to disable GA."
  type        = string
  default     = null
}

variable "public_ga_measurement_id_preview" {
  description = "GA4 Measurement ID for preview builds. Leave null/empty to disable GA."
  type        = string
  default     = null
}

variable "public_sentry_dsn_production" {
  description = "Sentry DSN exposed to production frontend as PUBLIC_SENTRY_DSN. Leave null/empty to disable Sentry in production."
  type        = string
  default     = null
}

variable "public_sentry_dsn_preview" {
  description = "Sentry DSN exposed to preview frontend as PUBLIC_SENTRY_DSN. Leave null/empty to disable Sentry in preview."
  type        = string
  default     = null
}

variable "sentry_org" {
  description = "Sentry organization slug for source map uploads in GitHub Actions (example: institute-for-police-conduct-i)."
  type        = string
  default     = null
}

variable "sentry_project" {
  description = "Sentry project slug for source map uploads in GitHub Actions."
  type        = string
  default     = null
}

variable "sentry_auth_token" {
  description = "Sentry auth token stored as SENTRY_AUTH_TOKEN GitHub environment secret for both production and preview. Leave null/empty to skip managing this secret."
  type        = string
  default     = null
  sensitive   = true
}

variable "github_org" {
  description = "GitHub organization/user that owns the repository."
  type        = string
  default     = "PoliceConductUS"
}

variable "github_repo" {
  description = "GitHub repository name."
  type        = string
  default     = "policeconduct.org"
}

variable "role_name" {
  description = "IAM role name for GitHub Actions OIDC."
  type        = string
  default     = "policeconduct-github-actions"
}

variable "forms_readonly_role_name" {
  description = "IAM role name for least-privilege read access to form submissions."
  type        = string
  default     = null
}

variable "forms_readonly_role_assume_principals" {
  description = "Principal ARNs allowed to assume the form submissions read-only role. Defaults to the current account root if empty."
  type        = list(string)
  default     = []
}

variable "existing_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN override. Leave null to create token.actions.githubusercontent.com provider."
  type        = string
  default     = null
}

variable "github_oidc_thumbprints" {
  description = "SHA-1 thumbprints for token.actions.githubusercontent.com."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "state_bucket_name" {
  description = "S3 bucket name override for Terraform state. Leave null to use <project_name>-tfstate-<account_id>."
  type        = string
  default     = null
}

variable "state_bucket_force_destroy" {
  description = "If true, allows destroying the Terraform state bucket when non-empty."
  type        = bool
  default     = false
}

variable "preview_bucket_name" {
  description = "S3 bucket name override for preview deployments. Leave null to use <project_name>-preview-<account_id>."
  type        = string
  default     = null
}

variable "preview_bucket_force_destroy" {
  description = "If true, allows destroying the preview bucket when non-empty."
  type        = bool
  default     = false
}

variable "forms_drafts_bucket_name" {
  description = "S3 bucket name override for saved form drafts. Leave null to use <project_name>-drafts-<account_id>."
  type        = string
  default     = null
}

variable "forms_submissions_bucket_name" {
  description = "S3 bucket name override for form submissions. Leave null to use <project_name>-submissions-<account_id>."
  type        = string
  default     = null
}

variable "forms_drafts_preview_bucket_name" {
  description = "S3 bucket name override for preview form drafts. Leave null to use <project_name>-preview-drafts-<account_id>."
  type        = string
  default     = null
}

variable "forms_submissions_preview_bucket_name" {
  description = "S3 bucket name override for preview form submissions. Leave null to use <project_name>-preview-submissions-<account_id>."
  type        = string
  default     = null
}

variable "forms_drafts_bucket_force_destroy" {
  description = "If true, allows destroying the drafts bucket when non-empty."
  type        = bool
  default     = false
}

variable "forms_submissions_bucket_force_destroy" {
  description = "If true, allows destroying the submissions bucket when non-empty."
  type        = bool
  default     = false
}

variable "forms_drafts_preview_bucket_force_destroy" {
  description = "If true, allows destroying the preview drafts bucket when non-empty."
  type        = bool
  default     = false
}

variable "forms_submissions_preview_bucket_force_destroy" {
  description = "If true, allows destroying the preview submissions bucket when non-empty."
  type        = bool
  default     = false
}

variable "forms_draft_active_window_seconds" {
  description = "Drafts older than this window are treated as inactive by the API read endpoint."
  type        = number
  default     = 3600
}

variable "forms_draft_max_bytes" {
  description = "Maximum draft payload size accepted by the save-draft endpoint."
  type        = number
  default     = 1048576
}

variable "forms_api_rate_limit_per_5m" {
  description = "Rate limit (requests per 5 minutes per source IP) for forms API."
  type        = number
  default     = 500
}

variable "site_rate_limit_per_5m" {
  description = "Global rate limit (requests per 5 minutes per source IP) for all CloudFront traffic."
  type        = number
  default     = 3000
}

variable "forms_api_alarm_5xx_threshold" {
  description = "CloudWatch alarm threshold for forms API Lambda errors in one period."
  type        = number
  default     = 10
}

variable "forms_api_alarm_latency_p95_ms_threshold" {
  description = "CloudWatch alarm threshold for forms API Lambda p95 duration in milliseconds."
  type        = number
  default     = 2000
}

variable "forms_lambda_alarm_throttles_threshold" {
  description = "CloudWatch alarm threshold for Lambda throttles in one period."
  type        = number
  default     = 1
}

variable "lambda_nodejs_runtime" {
  description = "Node.js runtime identifier for forms API Lambda functions."
  type        = string
  default     = "nodejs22.x"
}

variable "alarm_actions" {
  description = "Optional list of SNS topic ARNs (or other alarm action ARNs) to notify when alarms trigger."
  type        = list(string)
  default     = []
}

variable "site_bucket_force_destroy" {
  description = "If true, allows deleting a non-empty site bucket."
  type        = bool
  default     = false
}

variable "enable_site_bucket_versioning" {
  description = "If true, enables object versioning for the site bucket."
  type        = bool
  default     = true
}

variable "hosted_zone_id" {
  description = "Existing public Route 53 hosted zone ID to reuse. If null, this stack creates/manages the public hosted zone for domain_name."
  type        = string
  default     = null
}

variable "www_record_mode" {
  description = "How to configure the www record: alias, cname, or none."
  type        = string
  default     = "alias"

  validation {
    condition     = contains(["alias", "cname", "none"], var.www_record_mode)
    error_message = "www_record_mode must be one of: alias, cname, none."
  }
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.price_class)
    error_message = "price_class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

variable "waf_web_acl_arn" {
  description = "WAFv2 Web ACL ARN for CloudFront. Leave null for a pure static site."
  type        = string
  default     = null
}

variable "redirect_domains" {
  description = "Additional domains that should 301 redirect to redirect_target_url using the primary CloudFront distribution."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for domain in var.redirect_domains :
      length(split(".", trimspace(domain))) >= 2
    ])
    error_message = "Each redirect_domains value must be a fully qualified domain name."
  }
}

variable "redirect_domain_zone_ids" {
  description = "Optional map of redirect domain name to Route 53 hosted zone ID for automated DNS record management."
  type        = map(string)
  default     = {}
}

variable "managed_redirect_zones" {
  description = "Apex redirect domains for which Terraform should create public Route 53 hosted zones (for example, iceconduct.org)."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for zone in var.managed_redirect_zones :
      length(split(".", trimspace(zone))) >= 2
    ])
    error_message = "Each managed_redirect_zones value must be a valid apex domain."
  }
}

variable "redirect_target_url" {
  description = "Absolute https URL used as the redirect destination for redirect_domains. Leave null to disable."
  type        = string
  default     = null

  validation {
    condition     = var.redirect_target_url == null || can(regex("^https://", trimspace(var.redirect_target_url)))
    error_message = "redirect_target_url must be an absolute https URL when set."
  }
}

variable "extra_dns_records" {
  description = "Additional Route 53 records to create in the hosted zone (for MX/TXT/SPF/DKIM/verification, etc.)."
  type = list(object({
    name    = string
    type    = string
    ttl     = optional(number)
    records = optional(list(string))
    alias = optional(object({
      name                   = string
      zone_id                = string
      evaluate_target_health = optional(bool)
    }))
  }))
  default = []

  validation {
    condition = alltrue([
      for record in var.extra_dns_records : (
        (try(record.alias, null) == null && try(length(record.records), 0) > 0) ||
        (try(record.alias, null) != null && try(length(record.records), 0) == 0)
      )
    ])
    error_message = "Each extra_dns_records item must define either records (non-empty) or alias, but not both."
  }

  validation {
    condition = alltrue([
      for record in var.extra_dns_records :
      try(record.alias, null) == null || contains(["A", "AAAA"], upper(record.type))
    ])
    error_message = "Alias entries in extra_dns_records must use record type A or AAAA."
  }
}

variable "tags" {
  description = "Tags applied to all taggable resources."
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "policeconduct.org"
    Stack     = "bootstrap"
  }
}
