variable "aws_region" {
  description = "AWS region for Route53 and CloudFront-managed resources."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Redirect source apex domain."
  type        = string
  default     = "iceconduct.org"
}

variable "redirect_target_url" {
  description = "Absolute destination URL for redirects."
  type        = string
  default     = "https://policeconduct.org/law-enforcement-agency/federal/ice/"

  validation {
    condition     = can(regex("^https://", trimspace(var.redirect_target_url)))
    error_message = "redirect_target_url must be an absolute https URL."
  }
}

variable "project_name" {
  description = "Short identifier used in CloudFront resource names."
  type        = string
  default     = "iceconduct-redirect"
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

variable "tags" {
  description = "Tags applied to taggable resources."
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "iceconduct.org"
    Stack     = "bootstrap-iceconduct"
  }
}
