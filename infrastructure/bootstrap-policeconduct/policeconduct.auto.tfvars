# Desired inputs for this stack. Terraform loads this file on every plan and apply,
# so every checkout and worktree plans against the same values.
# Secrets never go here: tokens and API keys come from the git-ignored .env files.

project_name = "policeconduct"
aws_region   = "us-east-1"
domain_name  = "policeconduct.org"

github_org                 = "PoliceConductUS"
github_repo                = "policeconduct.org"
role_name                  = "policeconduct-github-actions"
existing_oidc_provider_arn = "arn:aws:iam::942370948729:oidc-provider/token.actions.githubusercontent.com"

state_bucket_force_destroy                     = false
preview_bucket_force_destroy                   = false
site_bucket_force_destroy                      = false
forms_drafts_bucket_force_destroy              = false
forms_submissions_bucket_force_destroy         = false
forms_drafts_preview_bucket_force_destroy      = false
forms_submissions_preview_bucket_force_destroy = false
forms_draft_active_window_seconds              = 3600
forms_draft_max_bytes                          = 1048576
site_rate_limit_per_5m                         = 3000
forms_api_rate_limit_per_5m                    = 500
forms_api_alarm_5xx_threshold                  = 10
forms_api_alarm_latency_p95_ms_threshold       = 2000
forms_lambda_alarm_throttles_threshold         = 1
lambda_nodejs_runtime                          = "nodejs22.x"
alarm_actions                                  = []
alert_topic_name                               = "policeconduct-alerts"
alert_email_endpoints                          = ["hello@policeconduct.org"]
enable_site_bucket_versioning                  = true
# These null values take precedence over GA and Sentry values in the .env files,
# so Terraform writes no GA or Sentry settings to the GitHub environments.
ga_measurement_id_production = null
ga_measurement_id_preview    = null
sentry_dsn_production        = null
sentry_dsn_preview           = null
sentry_org                   = null
sentry_project               = null
sentry_auth_token            = null
recaptcha_min_score          = 0.5
extra_dns_records = [
  {
    name = "@"
    type = "MX"
    ttl  = 3600
    records = [
      "1 ASPMX.L.GOOGLE.COM.",
      "5 ALT1.ASPMX.L.GOOGLE.COM.",
      "5 ALT2.ASPMX.L.GOOGLE.COM.",
      "10 ALT3.ASPMX.L.GOOGLE.COM.",
      "10 ALT4.ASPMX.L.GOOGLE.COM."
    ]
  },
  {
    name = "@"
    type = "TXT"
    ttl  = 3600
    records = [
      "google-site-verification=r9I8IwRqE3RAQrNoUDHJIH15kX4KfturROPETbT0nJo",
      "v=spf1 include:_spf.google.com ~all"
    ]
  }
]

tags = {
  Project   = "policeconduct.org"
  ManagedBy = "Terraform"
  Stack     = "bootstrap"
}
submission_notification_email_endpoints = ["hello@policeconduct.org"]
