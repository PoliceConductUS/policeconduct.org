# Page records and acquisition evidence are never CloudFront origins.
resource "aws_s3_bucket" "release_data" {
  for_each = toset(["prod", "preview"])
  bucket   = "${var.project_name}-${each.key}-release-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "release_data" {
  for_each                = aws_s3_bucket.release_data
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "archive_file" "release_api" {
  type        = "zip"
  source_dir  = "${path.module}/lambdas/release-api"
  output_path = "${path.module}/lambdas/release-api.zip"
}

resource "aws_iam_role" "release_api" {
  name               = "${var.project_name}-release-api"
  assume_role_policy = data.aws_iam_policy_document.forms_lambda_assume_role.json
}

data "aws_iam_policy_document" "release_api" {
  statement {
    actions = [
      "cloudfront-keyvaluestore:GetKey",
      "cloudfront-keyvaluestore:DescribeKeyValueStore",
      "cloudfront-keyvaluestore:UpdateKeys",
    ]
    resources = [aws_cloudfront_key_value_store.site_redirects.arn]
  }
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/builds/prod-*/override/*"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "release_api" {
  role   = aws_iam_role.release_api.id
  policy = data.aws_iam_policy_document.release_api.json
}

resource "aws_iam_role_policy_attachment" "release_api_logs" {
  role       = aws_iam_role.release_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Invoke via the authenticated Lambda API. There is no Function URL.
resource "aws_lambda_function" "release_api" {
  function_name    = "${var.project_name}-release-api"
  role             = aws_iam_role.release_api.arn
  handler          = "index.handler"
  runtime          = var.lambda_nodejs_runtime
  filename         = data.archive_file.release_api.output_path
  source_code_hash = data.archive_file.release_api.output_base64sha256
  timeout          = 30
  environment {
    variables = {
      KVS_ARN             = aws_cloudfront_key_value_store.site_redirects.arn
      RELEASE_DATA_BUCKET = aws_s3_bucket.release_data["prod"].id
      S3_BUCKET           = aws_s3_bucket.site.id
      CLOUDFRONT_DIST_ID  = aws_cloudfront_distribution.site.id
    }
  }
}

data "aws_iam_policy_document" "intake_news_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/intake:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "intake_news" {
  name               = "${var.project_name}-intake-news"
  assume_role_policy = data.aws_iam_policy_document.intake_news_trust.json
}

# The historical importer may use this read policy with its local AWS identity.
data "aws_iam_policy_document" "release_read" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.release_data["prod"].arn]
  }
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.release_data["prod"].arn}/builds/prod-*/data/*",
      "${aws_s3_bucket.release_data["prod"].arn}/news-discovery/*",
    ]
  }
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.release_snapshot.arn]
  }
}

resource "aws_lambda_function" "release_snapshot" {
  function_name    = "${var.project_name}-release-snapshot"
  role             = aws_iam_role.release_api.arn
  handler          = "index.snapshot"
  runtime          = var.lambda_nodejs_runtime
  filename         = data.archive_file.release_api.output_path
  source_code_hash = data.archive_file.release_api.output_base64sha256
  timeout          = 30
  environment {
    variables = {
      KVS_ARN             = aws_cloudfront_key_value_store.site_redirects.arn
      RELEASE_DATA_BUCKET = aws_s3_bucket.release_data["prod"].id
    }
  }
}

resource "aws_iam_policy" "release_read" {
  name   = "${var.project_name}-release-read"
  policy = data.aws_iam_policy_document.release_read.json
}

resource "aws_iam_role_policy_attachment" "intake_release_read" {
  role       = aws_iam_role.intake_news.name
  policy_arn = aws_iam_policy.release_read.arn
}

data "aws_iam_policy_document" "intake_news" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.release_api.arn]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.site.arn}/builds/prod-*/static/*",
      "${aws_s3_bucket.site.arn}/builds/prod-*/override/*",
    ]
  }
  statement {
    actions = ["s3:PutObject"]
    resources = [
      "${aws_s3_bucket.site.arn}/builds/prod-*/override/*",
      "${aws_s3_bucket.release_data["prod"].arn}/builds/prod-*/data/*",
      "${aws_s3_bucket.release_data["prod"].arn}/news-discovery/*",
    ]
  }
  statement {
    effect    = "Deny"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.release_data["prod"].arn}/builds/*/data/dynamic.json"]
  }
  statement {
    actions   = ["cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "intake_news" {
  role   = aws_iam_role.intake_news.id
  policy = data.aws_iam_policy_document.intake_news.json
}

output "release_data_bucket_name" {
  value = aws_s3_bucket.release_data["prod"].id
}
output "preview_release_data_bucket_name" {
  value = aws_s3_bucket.release_data["preview"].id
}
output "release_read_policy_arn" {
  value = aws_iam_policy.release_read.arn
}
output "intake_news_configuration" {
  value = {
    AWS_ROLE_ARN          = aws_iam_role.intake_news.arn
    AWS_REGION            = var.aws_region
    NEWS_RELEASE_FUNCTION = aws_lambda_function.release_api.function_name
    NEWS_PRIVATE_BUCKET   = aws_s3_bucket.release_data["prod"].id
    NEWS_SITE_BUCKET      = aws_s3_bucket.site.id
    NEWS_DISTRIBUTION_ID  = aws_cloudfront_distribution.site.id
  }
}

output "release_snapshot_function" {
  value = aws_lambda_function.release_snapshot.function_name
}
