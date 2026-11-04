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
