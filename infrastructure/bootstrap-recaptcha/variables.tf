variable "aws_region" {
  description = "AWS region for the Secrets Manager secret."
  type        = string
  default     = "us-east-1"
}

variable "gcp_project_id" {
  description = "Google Cloud project ID that will host reCAPTCHA Enterprise resources."
  type        = string
}

variable "service_account_account_id" {
  description = "Google service account ID used by the forms API for reCAPTCHA assessments."
  type        = string
  default     = "policeconduct-recaptcha-assessor"
}

variable "service_account_display_name" {
  description = "Display name for the Google service account used by forms API."
  type        = string
  default     = "policeconduct reCAPTCHA assessor"
}

variable "recaptcha_key_display_name" {
  description = "Display name for the reCAPTCHA Enterprise site key."
  type        = string
  default     = "policeconduct-site"
}

variable "service_account_secret_name" {
  description = "AWS Secrets Manager secret name that stores the Google service account JSON."
  type        = string
  default     = "policeconduct/recaptcha-service-account"
}

variable "allowed_domains" {
  description = "Allowed domains for the reCAPTCHA Enterprise site key."
  type        = list(string)
  default = [
    "www.policeconduct.org",
    "policeconduct.org",
    "localhost",
    "127.0.0.1",
  ]

  validation {
    condition     = length(var.allowed_domains) > 0
    error_message = "allowed_domains must contain at least one domain."
  }
}

variable "labels" {
  description = "Labels applied to reCAPTCHA resources."
  type        = map(string)
  default = {
    managed_by = "terraform"
    project    = "policeconduct-org"
    stack      = "bootstrap-recaptcha"
  }
}

variable "aws_tags" {
  description = "Tags applied to AWS resources in this stack."
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "policeconduct.org"
    Stack     = "bootstrap-recaptcha"
  }
}
