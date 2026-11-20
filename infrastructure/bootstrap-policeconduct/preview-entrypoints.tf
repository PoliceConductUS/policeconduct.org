# Preview has its own certificate. The production certificate does not list a
# preview name.
resource "aws_acm_certificate" "preview" {
  provider                  = aws.us_east_1
  domain_name               = "preview.${var.domain_name}"
  subject_alternative_names = [local.preview_wildcard_domain]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }

  tags = {
    Environment = "preview"
  }
}

# ACM gives preview.<domain> and *.preview.<domain> one validation record. It
# came from the production certificate while that certificate listed the
# wildcard; it now comes from this certificate. ACM derives the record from the
# domain name and the account, so its name and value do not change, and the move
# keeps the live record in place for renewal.
moved {
  from = aws_route53_record.acm_validation["*.preview.policeconduct.org"]
  to   = aws_route53_record.preview_acm_validation["*.preview.policeconduct.org"]
}

resource "aws_route53_record" "preview_acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.preview.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
    if dvo.domain_name == local.preview_wildcard_domain
  }

  allow_overwrite = false
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.route53_zone_id
}

resource "aws_acm_certificate_validation" "preview" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.preview.arn
  validation_record_fqdns = [aws_route53_record.preview_acm_validation[local.preview_wildcard_domain].fqdn]
}

resource "aws_route53_record" "preview_root" {
  for_each        = toset(["A", "AAAA"])
  allow_overwrite = false
  zone_id         = local.route53_zone_id
  name            = "preview.${var.domain_name}"
  type            = each.value
  alias {
    name                   = aws_cloudfront_distribution.preview.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# Small diagnostic pages requested for the bare preview and PR-13 route.
resource "aws_s3_object" "preview_entrypoint" {
  for_each      = toset(["index.html", "pr-13/index.html", "404.html"])
  bucket        = aws_s3_bucket.preview.id
  key           = each.value
  source        = "${path.module}/preview-pages/${each.value}"
  source_hash   = filemd5("${path.module}/preview-pages/${each.value}")
  content_type  = "text/html; charset=utf-8"
  cache_control = "no-cache"

  tags = {
    Environment = "preview"
  }
}
