data "aws_caller_identity" "current" {}

locals {
  provided_oidc_provider_arn            = var.existing_oidc_provider_arn == null || trimspace(var.existing_oidc_provider_arn) == "" ? null : trimspace(var.existing_oidc_provider_arn)
  create_oidc_provider                  = local.provided_oidc_provider_arn == null
  oidc_provider_arn                     = local.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : local.provided_oidc_provider_arn
  state_bucket_name                     = var.state_bucket_name == null || trimspace(var.state_bucket_name) == "" ? "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}" : trimspace(var.state_bucket_name)
  site_bucket_name                      = var.bucket_name == null || trimspace(var.bucket_name) == "" ? "${var.project_name}-site-${data.aws_caller_identity.current.account_id}" : trimspace(var.bucket_name)
  preview_bucket_name                   = var.preview_bucket_name == null || trimspace(var.preview_bucket_name) == "" ? "${var.project_name}-preview-${data.aws_caller_identity.current.account_id}" : trimspace(var.preview_bucket_name)
  forms_drafts_bucket_name              = var.forms_drafts_bucket_name == null || trimspace(var.forms_drafts_bucket_name) == "" ? "${var.project_name}-drafts-${data.aws_caller_identity.current.account_id}" : trimspace(var.forms_drafts_bucket_name)
  forms_submissions_bucket_name         = var.forms_submissions_bucket_name == null || trimspace(var.forms_submissions_bucket_name) == "" ? "${var.project_name}-submissions-${data.aws_caller_identity.current.account_id}" : trimspace(var.forms_submissions_bucket_name)
  forms_drafts_preview_bucket_name      = var.forms_drafts_preview_bucket_name == null || trimspace(var.forms_drafts_preview_bucket_name) == "" ? "${var.project_name}-preview-drafts-${data.aws_caller_identity.current.account_id}" : trimspace(var.forms_drafts_preview_bucket_name)
  forms_submissions_preview_bucket_name = var.forms_submissions_preview_bucket_name == null || trimspace(var.forms_submissions_preview_bucket_name) == "" ? "${var.project_name}-preview-submissions-${data.aws_caller_identity.current.account_id}" : trimspace(var.forms_submissions_preview_bucket_name)
  effective_site_bucket_names = [
    local.site_bucket_name,
    local.preview_bucket_name,
  ]
  github_repo_sub                      = "repo:${var.github_org}/${var.github_repo}:*"
  www_domain                           = "www.${var.domain_name}"
  include_www                          = var.www_record_mode != "none"
  create_www_alias_records             = var.www_record_mode == "alias"
  create_www_cname_record              = var.www_record_mode == "cname"
  preview_wildcard_domain              = "*.preview.${var.domain_name}"
  distribution_aliases                 = local.include_www ? [var.domain_name, local.www_domain] : [var.domain_name]
  preview_distribution_aliases         = [local.preview_wildcard_domain]
  certificate_san_names                = local.include_www ? [local.www_domain, local.preview_wildcard_domain] : [local.preview_wildcard_domain]
  origin_id                            = "s3-${local.site_bucket_name}"
  preview_origin_id                    = "s3-${local.preview_bucket_name}"
  forms_api_origin_id                  = "forms-api-prod-url"
  forms_api_preview_origin_id          = "forms-api-preview-url"
  forms_api_origin_domain_name         = trimsuffix(replace(aws_lambda_function_url.forms_api_prod.function_url, "https://", ""), "/")
  forms_api_preview_origin_domain_name = trimsuffix(replace(aws_lambda_function_url.forms_api_preview.function_url, "https://", ""), "/")
  site_oac_name                        = "${var.project_name}-oac"
  index_rewrite_function_name          = "${var.project_name}-index-rewrite"
  preview_router_function_name         = "${var.project_name}-preview-router"
  provided_hosted_zone_id              = var.hosted_zone_id == null || trimspace(var.hosted_zone_id) == "" ? null : trimspace(var.hosted_zone_id)
  manage_hosted_zone                   = local.provided_hosted_zone_id == null
  route53_zone_id                      = local.manage_hosted_zone ? aws_route53_zone.site[0].zone_id : local.provided_hosted_zone_id
  cloudfront_hosted_zone_id            = "Z2FDTNDATAQYW2"
  normalized_extra_dns_records = [
    for record in var.extra_dns_records : merge(record, {
      name = trimspace(record.name) == "" || trimspace(record.name) == "@" ? var.domain_name : trimspace(record.name)
      type = upper(trimspace(record.type))
      ttl  = try(record.ttl, 300)
    })
  ]
  extra_dns_records_map = {
    for idx, record in local.normalized_extra_dns_records : tostring(idx) => record
  }
  public_ga_measurement_id_production = var.public_ga_measurement_id_production == null || trimspace(var.public_ga_measurement_id_production) == "" ? null : trimspace(var.public_ga_measurement_id_production)
  public_ga_measurement_id_preview    = var.public_ga_measurement_id_preview == null || trimspace(var.public_ga_measurement_id_preview) == "" ? null : trimspace(var.public_ga_measurement_id_preview)
  public_sentry_dsn_production        = var.public_sentry_dsn_production == null || trimspace(var.public_sentry_dsn_production) == "" ? null : trimspace(var.public_sentry_dsn_production)
  public_sentry_dsn_preview           = var.public_sentry_dsn_preview == null || trimspace(var.public_sentry_dsn_preview) == "" ? null : trimspace(var.public_sentry_dsn_preview)
  sentry_org                          = var.sentry_org == null || trimspace(var.sentry_org) == "" ? null : trimspace(var.sentry_org)
  sentry_project                      = var.sentry_project == null || trimspace(var.sentry_project) == "" ? null : trimspace(var.sentry_project)
  sentry_auth_token                   = var.sentry_auth_token == null || trimspace(var.sentry_auth_token) == "" ? null : trimspace(var.sentry_auth_token)
  has_sentry_auth_token               = nonsensitive(local.sentry_auth_token != null)
  github_environment_names            = toset(["production", "preview"])
  github_environment_variables = {
    production = merge(
      {
        AWS_ROLE_ARN       = aws_iam_role.github_actions.arn
        S3_BUCKET          = aws_s3_bucket.site.id
        CLOUDFRONT_DIST_ID = aws_cloudfront_distribution.site.id
      },
      local.public_ga_measurement_id_production == null ? {} : {
        PUBLIC_GA_MEASUREMENT_ID = local.public_ga_measurement_id_production
      },
      local.public_sentry_dsn_production == null ? {} : {
        PUBLIC_SENTRY_DSN         = local.public_sentry_dsn_production
        PUBLIC_SENTRY_ENVIRONMENT = "production"
      },
      local.sentry_org == null ? {} : {
        SENTRY_ORG = local.sentry_org
      },
      local.sentry_project == null ? {} : {
        SENTRY_PROJECT = local.sentry_project
      }
    )
    preview = merge(
      {
        AWS_ROLE_ARN       = aws_iam_role.github_actions.arn
        S3_BUCKET          = aws_s3_bucket.preview.id
        CLOUDFRONT_DIST_ID = aws_cloudfront_distribution.preview.id
      },
      local.public_ga_measurement_id_preview == null ? {} : {
        PUBLIC_GA_MEASUREMENT_ID = local.public_ga_measurement_id_preview
      },
      local.public_sentry_dsn_preview == null ? {} : {
        PUBLIC_SENTRY_DSN         = local.public_sentry_dsn_preview
        PUBLIC_SENTRY_ENVIRONMENT = "preview"
      },
      local.sentry_org == null ? {} : {
        SENTRY_ORG = local.sentry_org
      },
      local.sentry_project == null ? {} : {
        SENTRY_PROJECT = local.sentry_project
      }
    )
  }
  github_environment_variable_bindings = merge([
    for environment_name, env_vars in local.github_environment_variables : {
      for variable_name, variable_value in env_vars :
      "${environment_name}:${variable_name}" => {
        environment = environment_name
        name        = variable_name
        value       = variable_value
      }
    }
  ]...)
}

locals {
  existing_site_oac_id             = trimspace(try(data.external.cloudfront_existing.result.oac_id, ""))
  existing_index_rewrite_arn       = trimspace(try(data.external.cloudfront_existing.result.index_function_arn, ""))
  existing_preview_router_arn      = trimspace(try(data.external.cloudfront_existing.result.preview_function_arn, ""))
  existing_site_distribution_id    = trimspace(try(data.external.cloudfront_existing.result.site_distribution_id, ""))
  existing_preview_distribution_id = trimspace(try(data.external.cloudfront_existing.result.preview_distribution_id, ""))
}

data "archive_file" "forms_api_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambdas/forms-api/index.mjs"
  output_path = "${path.module}/lambdas/forms-api.zip"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket        = local.state_bucket_name
  force_destroy = var.state_bucket_force_destroy
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "state_bucket_tls_only" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "terraform_state_tls_only" {
  bucket = aws_s3_bucket.terraform_state.id
  policy = data.aws_iam_policy_document.state_bucket_tls_only.json
}

resource "aws_s3_bucket" "preview" {
  bucket        = local.preview_bucket_name
  force_destroy = var.preview_bucket_force_destroy
}

resource "aws_s3_bucket_public_access_block" "preview" {
  bucket = aws_s3_bucket.preview.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "preview" {
  bucket = aws_s3_bucket.preview.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "preview" {
  bucket = aws_s3_bucket.preview.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "preview" {
  bucket = aws_s3_bucket.preview.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket" "forms_drafts" {
  bucket        = local.forms_drafts_bucket_name
  force_destroy = var.forms_drafts_bucket_force_destroy
}

resource "aws_kms_key" "forms_drafts" {
  description         = "KMS key for ${var.project_name} form drafts bucket."
  enable_key_rotation = true
}

resource "aws_kms_alias" "forms_drafts" {
  name          = "alias/${var.project_name}-forms-drafts"
  target_key_id = aws_kms_key.forms_drafts.key_id
}

resource "aws_s3_bucket_public_access_block" "forms_drafts" {
  bucket = aws_s3_bucket.forms_drafts.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "forms_drafts" {
  bucket = aws_s3_bucket.forms_drafts.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "forms_drafts" {
  bucket = aws_s3_bucket.forms_drafts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "forms_drafts" {
  bucket = aws_s3_bucket.forms_drafts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.forms_drafts.arn
    }
  }
}

resource "aws_s3_bucket" "forms_submissions" {
  bucket        = local.forms_submissions_bucket_name
  force_destroy = var.forms_submissions_bucket_force_destroy
}

resource "aws_kms_key" "forms_submissions" {
  description         = "KMS key for ${var.project_name} form submissions bucket."
  enable_key_rotation = true
}

resource "aws_kms_alias" "forms_submissions" {
  name          = "alias/${var.project_name}-forms-submissions"
  target_key_id = aws_kms_key.forms_submissions.key_id
}

resource "aws_s3_bucket_public_access_block" "forms_submissions" {
  bucket = aws_s3_bucket.forms_submissions.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "forms_submissions" {
  bucket = aws_s3_bucket.forms_submissions.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "forms_submissions" {
  bucket = aws_s3_bucket.forms_submissions.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "forms_submissions" {
  bucket = aws_s3_bucket.forms_submissions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.forms_submissions.arn
    }
  }
}

resource "aws_s3_bucket" "forms_drafts_preview" {
  bucket        = local.forms_drafts_preview_bucket_name
  force_destroy = var.forms_drafts_preview_bucket_force_destroy
}

resource "aws_kms_key" "forms_drafts_preview" {
  description         = "KMS key for ${var.project_name} preview form drafts bucket."
  enable_key_rotation = true
}

resource "aws_kms_alias" "forms_drafts_preview" {
  name          = "alias/${var.project_name}-preview-forms-drafts"
  target_key_id = aws_kms_key.forms_drafts_preview.key_id
}

resource "aws_s3_bucket_public_access_block" "forms_drafts_preview" {
  bucket = aws_s3_bucket.forms_drafts_preview.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "forms_drafts_preview" {
  bucket = aws_s3_bucket.forms_drafts_preview.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "forms_drafts_preview" {
  bucket = aws_s3_bucket.forms_drafts_preview.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "forms_drafts_preview" {
  bucket = aws_s3_bucket.forms_drafts_preview.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.forms_drafts_preview.arn
    }
  }
}

resource "aws_s3_bucket" "forms_submissions_preview" {
  bucket        = local.forms_submissions_preview_bucket_name
  force_destroy = var.forms_submissions_preview_bucket_force_destroy
}

resource "aws_kms_key" "forms_submissions_preview" {
  description         = "KMS key for ${var.project_name} preview form submissions bucket."
  enable_key_rotation = true
}

resource "aws_kms_alias" "forms_submissions_preview" {
  name          = "alias/${var.project_name}-preview-forms-submissions"
  target_key_id = aws_kms_key.forms_submissions_preview.key_id
}

resource "aws_s3_bucket_public_access_block" "forms_submissions_preview" {
  bucket = aws_s3_bucket.forms_submissions_preview.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "forms_submissions_preview" {
  bucket = aws_s3_bucket.forms_submissions_preview.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "forms_submissions_preview" {
  bucket = aws_s3_bucket.forms_submissions_preview.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "forms_submissions_preview" {
  bucket = aws_s3_bucket.forms_submissions_preview.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.forms_submissions_preview.arn
    }
  }
}

data "aws_iam_policy_document" "forms_drafts_bucket_policy" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.forms_drafts.arn,
      "${aws_s3_bucket.forms_drafts.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_drafts.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  statement {
    sid    = "DenyWrongKmsKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_drafts.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.forms_drafts.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "forms_drafts" {
  bucket = aws_s3_bucket.forms_drafts.id
  policy = data.aws_iam_policy_document.forms_drafts_bucket_policy.json
}

data "aws_iam_policy_document" "forms_submissions_bucket_policy" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.forms_submissions.arn,
      "${aws_s3_bucket.forms_submissions.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_submissions.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  statement {
    sid    = "DenyWrongKmsKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_submissions.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.forms_submissions.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "forms_submissions" {
  bucket = aws_s3_bucket.forms_submissions.id
  policy = data.aws_iam_policy_document.forms_submissions_bucket_policy.json
}

data "aws_iam_policy_document" "forms_drafts_preview_bucket_policy" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.forms_drafts_preview.arn,
      "${aws_s3_bucket.forms_drafts_preview.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_drafts_preview.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  statement {
    sid    = "DenyWrongKmsKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_drafts_preview.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.forms_drafts_preview.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "forms_drafts_preview" {
  bucket = aws_s3_bucket.forms_drafts_preview.id
  policy = data.aws_iam_policy_document.forms_drafts_preview_bucket_policy.json
}

data "aws_iam_policy_document" "forms_submissions_preview_bucket_policy" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.forms_submissions_preview.arn,
      "${aws_s3_bucket.forms_submissions_preview.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_submissions_preview.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  statement {
    sid    = "DenyWrongKmsKey"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.forms_submissions_preview.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.forms_submissions_preview.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "forms_submissions_preview" {
  bucket = aws_s3_bucket.forms_submissions_preview.id
  policy = data.aws_iam_policy_document.forms_submissions_preview_bucket_policy.json
}

data "aws_iam_policy_document" "forms_lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "forms_lambda" {
  name               = "${var.project_name}-forms-lambda"
  assume_role_policy = data.aws_iam_policy_document.forms_lambda_assume_role.json
}

data "aws_iam_policy_document" "forms_lambda_permissions" {
  statement {
    sid    = "CloudWatchLogsWrite"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"]
  }

  statement {
    sid    = "DraftBucketWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectTagging",
    ]
    resources = ["${aws_s3_bucket.forms_drafts.arn}/*"]
  }

  statement {
    sid    = "DraftBucketRead"
    effect = "Allow"
    actions = [
      "s3:GetObject",
    ]
    resources = ["${aws_s3_bucket.forms_drafts.arn}/*"]
  }

  statement {
    sid    = "SubmissionBucketWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectTagging",
    ]
    resources = ["${aws_s3_bucket.forms_submissions.arn}/*"]
  }

  statement {
    sid    = "PreviewDraftBucketWriteRead"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectTagging",
      "s3:GetObject",
    ]
    resources = ["${aws_s3_bucket.forms_drafts_preview.arn}/*"]
  }

  statement {
    sid    = "PreviewSubmissionBucketWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectTagging",
    ]
    resources = ["${aws_s3_bucket.forms_submissions_preview.arn}/*"]
  }

  statement {
    sid    = "DraftBucketKmsEncrypt"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.forms_drafts.arn]
  }

  statement {
    sid    = "DraftBucketKmsDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.forms_drafts.arn]
  }

  statement {
    sid    = "SubmissionBucketKmsEncrypt"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.forms_submissions.arn]
  }

  statement {
    sid    = "PreviewDraftBucketKmsEncryptDecrypt"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:Decrypt",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.forms_drafts_preview.arn]
  }

  statement {
    sid    = "PreviewSubmissionBucketKmsEncrypt"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.forms_submissions_preview.arn]
  }
}

resource "aws_iam_role_policy" "forms_lambda_permissions" {
  name   = "${var.project_name}-forms-lambda"
  role   = aws_iam_role.forms_lambda.id
  policy = data.aws_iam_policy_document.forms_lambda_permissions.json
}

resource "aws_lambda_function" "forms_api_prod" {
  function_name = "${var.project_name}-forms-api-prod"
  role          = aws_iam_role.forms_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 10

  filename         = data.archive_file.forms_api_lambda.output_path
  source_code_hash = data.archive_file.forms_api_lambda.output_base64sha256

  environment {
    variables = {
      DRAFTS_BUCKET          = aws_s3_bucket.forms_drafts.id
      DRAFTS_PREFIX          = "drafts/"
      SUBMISSIONS_BUCKET     = aws_s3_bucket.forms_submissions.id
      SUBMISSIONS_PREFIX     = "submissions/"
      DRAFT_ACTIVE_WINDOW_MS = tostring(var.forms_draft_active_window_seconds * 1000)
      MAX_DRAFT_BYTES        = tostring(var.forms_draft_max_bytes)
    }
  }
}

resource "aws_lambda_function" "forms_api_preview" {
  function_name = "${var.project_name}-forms-api-preview"
  role          = aws_iam_role.forms_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 10

  filename         = data.archive_file.forms_api_lambda.output_path
  source_code_hash = data.archive_file.forms_api_lambda.output_base64sha256

  environment {
    variables = {
      DRAFTS_BUCKET          = aws_s3_bucket.forms_drafts_preview.id
      DRAFTS_PREFIX          = "drafts/"
      SUBMISSIONS_BUCKET     = aws_s3_bucket.forms_submissions_preview.id
      SUBMISSIONS_PREFIX     = "submissions/"
      DRAFT_ACTIVE_WINDOW_MS = tostring(var.forms_draft_active_window_seconds * 1000)
      MAX_DRAFT_BYTES        = tostring(var.forms_draft_max_bytes)
    }
  }
}

resource "aws_lambda_function_url" "forms_api_prod" {
  function_name      = aws_lambda_function.forms_api_prod.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_function_url" "forms_api_preview" {
  function_name      = aws_lambda_function.forms_api_preview.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "forms_api_function_url_prod" {
  statement_id           = "AllowPublicInvokeViaFunctionUrlProd"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.forms_api_prod.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "forms_api_function_url_preview" {
  statement_id           = "AllowPublicInvokeViaFunctionUrlPreview"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.forms_api_preview.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_wafv2_web_acl" "forms_api_cloudfront" {
  provider    = aws.us_east_1
  name        = "${var.project_name}-forms-api"
  description = "Global and API rate limiting for CloudFront traffic."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitSitePerIp"
    priority = 1

    statement {
      rate_based_statement {
        limit              = var.site_rate_limit_per_5m
        aggregate_key_type = "IP"
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-site-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitApiPerIp"
    priority = 2

    statement {
      rate_based_statement {
        limit              = var.forms_api_rate_limit_per_5m
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }

            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-forms-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-forms-api-acl"
    sampled_requests_enabled   = true
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_prod_errors" {
  alarm_name          = "${var.project_name}-forms-api-prod-errors"
  alarm_description   = "Forms API prod Lambda is returning errors."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_api_alarm_5xx_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_prod.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_prod_duration_p95" {
  alarm_name          = "${var.project_name}-forms-api-prod-duration-p95"
  alarm_description   = "Forms API prod Lambda p95 duration is above threshold."
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_api_alarm_latency_p95_ms_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_prod.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_prod_throttles" {
  alarm_name          = "${var.project_name}-forms-api-prod-throttles"
  alarm_description   = "Forms API prod Lambda is throttling."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_lambda_alarm_throttles_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_prod.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_preview_errors" {
  alarm_name          = "${var.project_name}-forms-api-preview-errors"
  alarm_description   = "Forms API preview Lambda is returning errors."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_api_alarm_5xx_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_preview.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_preview_duration_p95" {
  alarm_name          = "${var.project_name}-forms-api-preview-duration-p95"
  alarm_description   = "Forms API preview Lambda p95 duration is above threshold."
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_api_alarm_latency_p95_ms_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_preview.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "forms_api_preview_throttles" {
  alarm_name          = "${var.project_name}-forms-api-preview-throttles"
  alarm_description   = "Forms API preview Lambda is throttling."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.forms_lambda_alarm_throttles_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.forms_api_preview.function_name
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  count = local.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.github_oidc_thumbprints
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    sid    = "GitHubActionsOidcAssumeRole"
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_repo_sub]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
  description        = "GitHub Actions OIDC role for ${var.github_org}/${var.github_repo}"
}

data "aws_iam_policy_document" "github_actions_permissions" {
  statement {
    sid    = "S3CreateBucket"
    effect = "Allow"

    actions = [
      "s3:CreateBucket",
      "s3:ListAllMyBuckets",
      "s3:GetAccountPublicAccessBlock",
      "s3:PutAccountPublicAccessBlock",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "StateBucketAccess"
    effect = "Allow"

    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning",
      "s3:GetBucketPublicAccessBlock",
      "s3:PutBucketPublicAccessBlock",
      "s3:GetBucketPolicy",
      "s3:PutBucketPolicy",
      "s3:DeleteBucketPolicy",
      "s3:GetBucketTagging",
      "s3:PutBucketTagging",
      "s3:DeleteBucketTagging",
      "s3:GetBucketOwnershipControls",
      "s3:PutBucketOwnershipControls",
      "s3:GetEncryptionConfiguration",
      "s3:PutEncryptionConfiguration",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectVersion",
    ]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*",
    ]
  }

  statement {
    sid    = "DeploymentBucketsAccess"
    effect = "Allow"

    actions = [
      "s3:GetBucketLocation",
      "s3:HeadBucket",
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning",
      "s3:GetBucketPublicAccessBlock",
      "s3:PutBucketPublicAccessBlock",
      "s3:GetBucketPolicy",
      "s3:PutBucketPolicy",
      "s3:DeleteBucketPolicy",
      "s3:GetBucketOwnershipControls",
      "s3:PutBucketOwnershipControls",
      "s3:GetEncryptionConfiguration",
      "s3:PutEncryptionConfiguration",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectVersion",
      "s3:PutObjectAcl",
    ]
    resources = flatten([
      for bucket_name in local.effective_site_bucket_names : [
        "arn:aws:s3:::${bucket_name}",
        "arn:aws:s3:::${bucket_name}/*",
      ]
    ])
  }

  statement {
    sid    = "CloudFrontAccess"
    effect = "Allow"

    actions = [
      "cloudfront:CreateDistribution",
      "cloudfront:UpdateDistribution",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:ListDistributions",
      "cloudfront:CreateInvalidation",
      "cloudfront:CreateOriginAccessControl",
      "cloudfront:UpdateOriginAccessControl",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:ListOriginAccessControls",
      "cloudfront:CreateFunction",
      "cloudfront:UpdateFunction",
      "cloudfront:DescribeFunction",
      "cloudfront:PublishFunction",
      "cloudfront:DeleteFunction",
      "cloudfront:ListFunctions",
      "cloudfront:TagResource",
      "cloudfront:UntagResource",
      "cloudfront:ListTagsForResource",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AcmAccess"
    effect = "Allow"

    actions = [
      "acm:RequestCertificate",
      "acm:DescribeCertificate",
      "acm:ListCertificates",
      "acm:AddTagsToCertificate",
      "acm:RemoveTagsFromCertificate",
      "acm:DeleteCertificate",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "Route53Access"
    effect = "Allow"

    actions = [
      "route53:CreateHostedZone",
      "route53:DeleteHostedZone",
      "route53:GetHostedZone",
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
      "route53:ChangeResourceRecordSets",
      "route53:ListResourceRecordSets",
      "route53:GetChange",
      "route53:ChangeTagsForResource",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "WafReadAccess"
    effect = "Allow"

    actions = [
      "wafv2:GetWebACL",
      "wafv2:ListWebACLs",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_actions_permissions" {
  name   = "${var.project_name}-github-actions"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}

data "aws_cloudfront_cache_policy" "managed_caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "managed_caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_response_headers_policy" "managed_security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

data "aws_cloudfront_origin_request_policy" "managed_all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "external" "cloudfront_existing" {
  program = ["bash", "${path.module}/scripts/cloudfront_lookup.sh"]

  query = {
    oac_name              = local.site_oac_name
    index_function_name   = local.index_rewrite_function_name
    preview_function_name = local.preview_router_function_name
    site_alias            = var.domain_name
    preview_alias         = local.preview_wildcard_domain
  }
}

import {
  for_each = local.existing_site_oac_id == "" ? {} : { site = local.existing_site_oac_id }
  to       = aws_cloudfront_origin_access_control.site
  id       = each.value
}

import {
  for_each = local.existing_index_rewrite_arn == "" ? {} : { index = local.index_rewrite_function_name }
  to       = aws_cloudfront_function.index_rewrite
  id       = each.value
}

import {
  for_each = local.existing_preview_router_arn == "" ? {} : { preview = local.preview_router_function_name }
  to       = aws_cloudfront_function.preview_router
  id       = each.value
}

import {
  for_each = local.existing_site_distribution_id == "" ? {} : { site = local.existing_site_distribution_id }
  to       = aws_cloudfront_distribution.site
  id       = each.value
}

import {
  for_each = local.existing_preview_distribution_id == "" ? {} : { preview = local.existing_preview_distribution_id }
  to       = aws_cloudfront_distribution.preview
  id       = each.value
}

resource "aws_route53_zone" "site" {
  count = local.manage_hosted_zone ? 1 : 0

  name = var.domain_name
}

resource "aws_s3_bucket" "site" {
  bucket        = local.site_bucket_name
  force_destroy = var.site_bucket_force_destroy
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id

  versioning_configuration {
    status = var.enable_site_bucket_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = local.site_oac_name
  description                       = "OAC for ${var.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_acm_certificate" "site" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = local.certificate_san_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.route53_zone_id
}

resource "aws_acm_certificate_validation" "site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

resource "aws_cloudfront_function" "index_rewrite" {
  name    = local.index_rewrite_function_name
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite extensionless URIs to index.html."
  publish = true
  code    = <<-EOF
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
EOF
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} static site"
  aliases             = local.distribution_aliases
  default_root_object = "index.html"
  http_version        = "http2and3"
  price_class         = var.price_class
  web_acl_id          = var.waf_web_acl_arn == null || trimspace(var.waf_web_acl_arn) == "" ? aws_wafv2_web_acl.forms_api_cloudfront.arn : var.waf_web_acl_arn

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  origin {
    domain_name = local.forms_api_origin_domain_name
    origin_id   = local.forms_api_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.managed_caching_optimized.id

    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.managed_security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.index_rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.forms_api_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host_header.id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin]
  }
}

resource "aws_cloudfront_function" "preview_router" {
  name    = local.preview_router_function_name
  runtime = "cloudfront-js-2.0"
  comment = "Route preview subdomains to matching S3 prefix."
  publish = true
  code    = <<-EOF
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value ? request.headers.host.value : '';
  var uri = request.uri;
  var match = host.match(/^([^.]+)\.preview\./);

  if (!match) {
    return request;
  }

  if (uri.endsWith('/')) {
    uri += 'index.html';
  } else if (!uri.includes('.')) {
    uri += '/index.html';
  }

  request.uri = '/' + match[1] + uri;
  return request;
}
EOF
}

resource "aws_cloudfront_distribution" "preview" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} preview static site"
  aliases             = local.preview_distribution_aliases
  default_root_object = "index.html"
  http_version        = "http2and3"
  price_class         = var.price_class
  web_acl_id          = var.waf_web_acl_arn == null || trimspace(var.waf_web_acl_arn) == "" ? aws_wafv2_web_acl.forms_api_cloudfront.arn : var.waf_web_acl_arn

  origin {
    domain_name              = aws_s3_bucket.preview.bucket_regional_domain_name
    origin_id                = local.preview_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  origin {
    domain_name = local.forms_api_preview_origin_domain_name
    origin_id   = local.forms_api_preview_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.preview_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.managed_caching_optimized.id

    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.managed_security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.preview_router.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.forms_api_preview_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host_header.id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  lifecycle {
    ignore_changes = [origin]
  }
}

data "aws_iam_policy_document" "site_bucket_policy" {
  statement {
    sid = "AllowCloudFrontServicePrincipalReadOnly"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket_policy.json
}

data "aws_iam_policy_document" "preview_bucket_policy" {
  statement {
    sid = "AllowPreviewCloudFrontServicePrincipalReadOnly"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.preview.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.preview.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "preview" {
  bucket = aws_s3_bucket.preview.id
  policy = data.aws_iam_policy_document.preview_bucket_policy.json
}

resource "aws_route53_record" "apex_a" {
  zone_id = local.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = local.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_alias_a" {
  count = local.create_www_alias_records ? 1 : 0

  zone_id = local.route53_zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_alias_aaaa" {
  count = local.create_www_alias_records ? 1 : 0

  zone_id = local.route53_zone_id
  name    = local.www_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_cname" {
  count = local.create_www_cname_record ? 1 : 0

  zone_id = local.route53_zone_id
  name    = local.www_domain
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.site.domain_name]
}

resource "aws_route53_record" "preview_wildcard_a" {
  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = local.preview_wildcard_domain
  type            = "A"

  alias {
    name                   = aws_cloudfront_distribution.preview.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "preview_wildcard_aaaa" {
  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = local.preview_wildcard_domain
  type            = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.preview.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "extra_standard" {
  for_each = {
    for key, record in local.extra_dns_records_map : key => record
    if try(record.alias, null) == null
  }

  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = each.value.ttl
  records         = each.value.records
}

resource "aws_route53_record" "extra_alias" {
  for_each = {
    for key, record in local.extra_dns_records_map : key => record
    if try(record.alias, null) != null
  }

  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = each.value.name
  type            = each.value.type

  alias {
    name                   = each.value.alias.name
    zone_id                = each.value.alias.zone_id
    evaluate_target_health = try(each.value.alias.evaluate_target_health, false)
  }
}

resource "github_repository_environment" "environments" {
  for_each = local.github_environment_names

  repository  = var.github_repo
  environment = each.value
}

resource "github_actions_environment_variable" "environment_variables" {
  for_each = local.github_environment_variable_bindings

  repository    = var.github_repo
  environment   = each.value.environment
  variable_name = each.value.name
  value         = each.value.value

  depends_on = [github_repository_environment.environments]
}

resource "github_actions_environment_secret" "sentry_auth_token" {
  for_each = local.has_sentry_auth_token ? local.github_environment_names : toset([])

  repository      = var.github_repo
  environment     = each.value
  secret_name     = "SENTRY_AUTH_TOKEN"
  plaintext_value = local.sentry_auth_token

  depends_on = [github_repository_environment.environments]
}
