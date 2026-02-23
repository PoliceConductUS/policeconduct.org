output "aws_role_arn" {
  description = "IAM role ARN to set as GitHub Actions variable AWS_ROLE_ARN."
  value       = aws_iam_role.github_actions.arn
}

output "aws_role_name" {
  description = "IAM role name for GitHub Actions."
  value       = aws_iam_role.github_actions.name
}

output "oidc_provider_arn" {
  description = "GitHub OIDC provider ARN used by the IAM role trust policy."
  value       = local.oidc_provider_arn
}

output "state_bucket_name" {
  description = "S3 bucket name for Terraform remote state."
  value       = aws_s3_bucket.terraform_state.id
}

output "site_bucket_names_effective" {
  description = "S3 bucket names granted to the GitHub Actions role for site deploy access."
  value       = local.effective_site_bucket_names
}

output "preview_bucket_name" {
  description = "S3 preview bucket used by PR preview workflows."
  value       = aws_s3_bucket.preview.id
}

output "site_bucket_name" {
  description = "Private S3 bucket hosting production site assets."
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for production."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name for production."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "preview_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for previews."
  value       = aws_cloudfront_distribution.preview.id
}

output "preview_cloudfront_domain_name" {
  description = "CloudFront distribution domain name for previews."
  value       = aws_cloudfront_distribution.preview.domain_name
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN used by CloudFront (in us-east-1)."
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "acm_validation_records_by_domain" {
  description = "DNS validation records required by ACM, keyed by domain name."
  value = {
    for dvo in aws_acm_certificate.site.domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "acm_validation_records_unmanaged" {
  description = "ACM DNS validation records for domains Terraform is not managing in Route53."
  value = {
    for dvo in aws_acm_certificate.site.domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
    if contains(local.unmanaged_acm_validation_domains, dvo.domain_name)
  }
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID used for DNS records."
  value       = local.route53_zone_id
}

output "route53_name_servers" {
  description = "Route 53 nameservers (only when this stack creates the hosted zone)."
  value       = local.manage_hosted_zone ? aws_route53_zone.site[0].name_servers : []
}

output "site_url" {
  description = "Primary site URL."
  value       = "https://${var.domain_name}"
}

output "www_url" {
  description = "www URL when enabled."
  value       = local.include_www ? "https://${local.www_domain}" : null
}

output "forms_api_url" {
  description = "Public forms API base path routed through CloudFront."
  value       = "/api"
}

output "forms_api_function_url" {
  description = "Lambda Function URL backing the production forms API origin."
  value       = aws_lambda_function_url.forms_api_prod.function_url
}

output "forms_api_preview_function_url" {
  description = "Lambda Function URL backing the preview forms API origin."
  value       = aws_lambda_function_url.forms_api_preview.function_url
}

output "recaptcha_site_key" {
  description = "Canonical reCAPTCHA site key used by frontend and forms runtime."
  value       = local.recaptcha_site_key
}

output "recaptcha_project_id" {
  description = "Canonical Google Cloud project ID used by forms runtime for reCAPTCHA assessments."
  value       = local.recaptcha_project_id
}

output "forms_drafts_bucket_name" {
  description = "S3 bucket storing form drafts."
  value       = aws_s3_bucket.forms_drafts.id
}

output "forms_submissions_bucket_name" {
  description = "S3 bucket storing form submissions."
  value       = aws_s3_bucket.forms_submissions.id
}

output "forms_drafts_preview_bucket_name" {
  description = "S3 bucket storing preview form drafts."
  value       = aws_s3_bucket.forms_drafts_preview.id
}

output "forms_submissions_preview_bucket_name" {
  description = "S3 bucket storing preview form submissions."
  value       = aws_s3_bucket.forms_submissions_preview.id
}

output "forms_drafts_kms_key_arn" {
  description = "KMS key ARN used to encrypt form drafts."
  value       = aws_kms_key.forms_drafts.arn
}

output "forms_submissions_kms_key_arn" {
  description = "KMS key ARN used to encrypt form submissions."
  value       = aws_kms_key.forms_submissions.arn
}

output "forms_readonly_role_arn" {
  description = "IAM role ARN for least-privilege read access to form submissions buckets and KMS keys."
  value       = aws_iam_role.forms_readonly.arn
}

output "forms_readonly_role_name" {
  description = "IAM role name for least-privilege read access to form submissions."
  value       = aws_iam_role.forms_readonly.name
}

output "forms_api_waf_web_acl_arn" {
  description = "WAFv2 Web ACL ARN protecting /api traffic on CloudFront."
  value       = aws_wafv2_web_acl.forms_api_cloudfront.arn
}
