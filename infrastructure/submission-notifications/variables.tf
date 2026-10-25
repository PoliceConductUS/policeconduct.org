variable "aws_region" {
  description = "Region holding the submissions buckets and the forms API Lambdas."
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = <<-EOT
    Expected AWS account. Checked against the caller at plan time so this stack
    cannot be applied into the wrong account by a stale AWS_PROFILE.
  EOT
  type        = string
  default     = "942370948729"
}

variable "project_name" {
  description = "Resource name prefix, matching the bootstrap stack."
  type        = string
  default     = "policeconduct"
}

variable "submission_notification_recipients" {
  description = <<-EOT
    Who is told that a submission arrived.

    There is no default and an empty list is refused. A notification path with
    no recipient is the exact state INS-20 found: a store that fills up, a
    console that reads as correctly configured, and 138 submissions nobody was
    ever told about. This stack will not apply without naming a human.
  EOT
  type        = list(string)

  validation {
    condition     = length([for e in var.submission_notification_recipients : e if trimspace(e) != ""]) > 0
    error_message = "submission_notification_recipients must name at least one address. A topic with no subscriber is the failure this stack exists to fix."
  }
}

variable "notification_canary_alert_endpoints" {
  description = <<-EOT
    Who is told that the notification path itself is BROKEN.

    Must not overlap submission_notification_recipients, and should ideally be
    on a different domain: policeconduct.org mail lives in a Google Workspace
    tenant IPC does not own (INS-55), so a tenant-level failure takes every
    policeconduct.org address at once — including the one meant to report it.
  EOT
  type        = list(string)

  validation {
    condition     = length([for e in var.notification_canary_alert_endpoints : e if trimspace(e) != ""]) > 0
    error_message = "notification_canary_alert_endpoints must name at least one address, or the liveness check has nowhere to report a failure."
  }

  validation {
    condition = length(setintersection(
      toset([for e in var.notification_canary_alert_endpoints : lower(trimspace(e))]),
      toset([for e in var.submission_notification_recipients : lower(trimspace(e))]),
    )) == 0
    error_message = "A canary alert address is also a notification recipient. If that mailbox dies, the alert about it dies with it (INS-58)."
  }
}

variable "notification_canary_schedule" {
  description = "EventBridge schedule expression for the liveness check."
  type        = string
  default     = "rate(1 day)"
}

variable "notification_receipts_since" {
  description = <<-EOT
    ISO date. Reconciliation ignores submissions stored before this date.

    The submissions that predate the notification path are INS-16 backlog, not
    canary findings; without a cutoff the reconciliation alarm would be breached
    from the moment it is created and would be muted within a week.
  EOT
  type        = string

  validation {
    condition     = can(formatdate("YYYY-MM-DD", "${var.notification_receipts_since}T00:00:00Z"))
    error_message = "notification_receipts_since must be a YYYY-MM-DD date."
  }
}

variable "submissions_bucket" {
  description = "Production submissions bucket. Referenced, never created here."
  type        = string
  default     = "policeconduct-submissions-942370948729"
}

variable "submissions_bucket_preview" {
  description = "Preview submissions bucket. Referenced, never created here."
  type        = string
  default     = "policeconduct-preview-submissions-942370948729"
}

variable "forms_api_prod_function_name" {
  description = "Production forms API Lambda, whose logs the notify alarms watch."
  type        = string
  default     = "policeconduct-forms-api-prod"
}

variable "lambda_nodejs_runtime" {
  description = "Node runtime for the canary, matching the bootstrap stack."
  type        = string
  default     = "nodejs22.x"
}
