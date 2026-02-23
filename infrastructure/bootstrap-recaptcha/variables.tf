variable "aws_region" {
  description = "AWS region for the Secrets Manager secret."
  type        = string
  default     = "us-east-1"
}

variable "recaptcha_project_id" {
  description = "Google Cloud project ID that will host reCAPTCHA Enterprise resources."
  type        = string
  default     = "ipc-policeconduct"
}

variable "service_account_account_id" {
  description = "Google service account ID used by the forms API for reCAPTCHA assessments."
  type        = string
  default     = "ipc-recaptcha-assessor"
}

variable "service_account_display_name" {
  description = "Display name for the Google service account used by forms API."
  type        = string
  default     = "policeconduct reCAPTCHA assessor"
}

variable "aws_forms_lambda_role_name" {
  description = "AWS IAM role name used by the forms Lambda functions."
  type        = string
  default     = "policeconduct-forms-lambda"
}

variable "workload_identity_pool_id" {
  description = "ID for the Google Workload Identity Pool used by AWS federation."
  type        = string
  default     = "policeconduct-aws-pool"
}

variable "workload_identity_pool_display_name" {
  description = "Display name for the Google Workload Identity Pool."
  type        = string
  default     = "PoliceConduct AWS Pool"
}

variable "workload_identity_provider_id" {
  description = "ID for the Google Workload Identity Pool Provider (AWS)."
  type        = string
  default     = "policeconduct-aws-provider"
}

variable "workload_identity_provider_display_name" {
  description = "Display name for the Google Workload Identity Provider."
  type        = string
  default     = "PoliceConduct AWS Provider"
}

variable "recaptcha_key_display_name" {
  description = "Display name for the reCAPTCHA Enterprise site key."
  type        = string
  default     = "policeconduct-site"
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
