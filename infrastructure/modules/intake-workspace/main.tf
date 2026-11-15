terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
variable "bucket_name" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Use a plain lowercase bucket name without dots or paths."
  }
}
variable "role_prefix" { type = string }
variable "operator_principals" {
  type = list(string)
  validation {
    condition     = length(var.operator_principals) > 0 && alltrue([for p in var.operator_principals : can(regex("^arn:aws:iam::[0-9]{12}:(root|role/.+|user/.+)$", p))])
    error_message = "Supply explicit IAM principal ARNs for workspace operators."
  }
}
locals {
  operator_roles = { for env in ["dev", "preview", "production"] : env => "${var.role_prefix}-${env}" }
  bucket_arn     = "arn:aws:s3:::${var.bucket_name}"
  policies = { for environment, role in local.operator_roles : environment => {
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetBucketVersioning", "s3:GetBucketTagging", "s3:GetBucketPublicAccessBlock", "s3:GetEncryptionConfiguration"], Resource = [local.bucket_arn] },
      { Effect = "Allow", Action = ["s3:ListBucket", "s3:ListBucketVersions"], Resource = [local.bucket_arn], Condition = { StringLike = { "s3:prefix" = ["${environment}/*"] } } },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"], Resource = ["${local.bucket_arn}/${environment}/*"] },
      { Effect = "Deny", Action = ["s3:DeleteObject", "s3:DeleteObjectVersion", "s3:PutLifecycleConfiguration", "s3:PutBucketVersioning", "s3:DeleteBucket"], Resource = [local.bucket_arn, "${local.bucket_arn}/*"] },
      { Effect = "Deny", Action = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"], Resource = [for other in ["dev", "preview", "production"] : "${local.bucket_arn}/${other}/*" if other != environment] }
    ]
  } }
}
resource "aws_s3_bucket" "workspace" {
  bucket        = var.bucket_name
  force_destroy = false
  tags          = { Purpose = "intake-workspace" }
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_versioning" "workspace" {
  bucket = aws_s3_bucket.workspace.id
  versioning_configuration { status = "Enabled" }
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "workspace" {
  bucket = aws_s3_bucket.workspace.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_public_access_block" "workspace" {
  bucket                  = aws_s3_bucket.workspace.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "workspace" {
  bucket = aws_s3_bucket.workspace.id
  rule { object_ownership = "BucketOwnerEnforced" }
}
resource "aws_s3_bucket_policy" "workspace" {
  bucket = aws_s3_bucket.workspace.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Sid = "RequireTLS", Effect = "Deny", Principal = "*", Action = "s3:*", Resource = [local.bucket_arn, "${local.bucket_arn}/*"], Condition = { Bool = { "aws:SecureTransport" = "false" } } },
      { Sid = "NeverServeThroughCloudFront", Effect = "Deny", Principal = { Service = "cloudfront.amazonaws.com" }, Action = "s3:*", Resource = [local.bucket_arn, "${local.bucket_arn}/*"] },
      { Sid = "RetainAllVersions", Effect = "Deny", Principal = "*", Action = ["s3:DeleteObject", "s3:DeleteObjectVersion", "s3:PutLifecycleConfiguration"], Resource = [local.bucket_arn, "${local.bucket_arn}/*"] }
    ]
  })
}
resource "aws_iam_role_policy" "workspace" {
  for_each = local.operator_roles
  name     = "intake-workspace-${each.key}"
  role     = aws_iam_role.workspace[each.key].name
  policy   = jsonencode(local.policies[each.key])
}
output "bucket_name" { value = aws_s3_bucket.workspace.id }
output "bucket_arn" { value = local.bucket_arn }
output "workspace_prefixes" { value = { for environment in keys(local.operator_roles) : environment => "s3://${var.bucket_name}/${environment}/" } }
output "operator_policies" { value = local.policies }

resource "aws_iam_role" "workspace" {
  for_each           = local.operator_roles
  name               = each.value
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { AWS = var.operator_principals }, Action = "sts:AssumeRole" }] })
}
output "operator_role_arns" { value = { for env, role in aws_iam_role.workspace : env => role.arn } }
