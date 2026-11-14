locals {
  www_domain                = "www.${var.domain_name}"
  preview_domains           = ["preview.${var.domain_name}", "*.preview.${var.domain_name}"]
  domain_aliases            = concat([var.domain_name, local.www_domain], local.preview_domains)
  cloudfront_hosted_zone_id = "Z2FDTNDATAQYW2"
  function_name             = "${var.project_name}-viewer-redirect"
}

data "aws_cloudfront_cache_policy" "managed_caching_disabled" {
  name = "Managed-CachingDisabled"
}

resource "aws_route53_zone" "site" {
  name = var.domain_name
}

resource "aws_acm_certificate" "site" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = concat([local.www_domain], local.preview_domains)
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
    } if !startswith(dvo.domain_name, "*.")
  }

  allow_overwrite = true
  zone_id         = aws_route53_zone.site.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

resource "aws_cloudfront_function" "redirect" {
  name    = local.function_name
  runtime = "cloudfront-js-2.0"
  comment = "Redirect Iceconduct hosts to corresponding PoliceConduct hosts."
  publish = true
  code    = <<-EOF
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value.toLowerCase();
  var source = ${jsonencode(var.domain_name)};
  var suffix = '.' + source;
  if (host !== source && !host.endsWith(suffix)) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }
  var target = ${jsonencode(var.redirect_target_url)};
  var targetParts = target.match(/^https:\/\/([^/]+)(\/.*)$/);
  var targetDomain = targetParts[1].replace(/^www\./, '');
  var targetHost = host.slice(0, host.length - source.length) + targetDomain;
  var path = request.uri === '/' ? targetParts[2] : request.uri;
  var query = [];
  Object.keys(request.querystring).forEach(function (key) {
    var entry = request.querystring[key];
    var values = entry.multiValue || [entry];
    values.forEach(function (item) {
      query.push(key + '=' + item.value);
    });
  });
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://' + targetHost + path + (query.length ? '?' + query.join('&') : '') },
      'cache-control': { value: 'public, max-age=3600' }
    }
  };
}
EOF
}

resource "aws_cloudfront_distribution" "redirect" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} redirect"
  aliases             = local.domain_aliases
  default_root_object = ""
  http_version        = "http2and3"
  price_class         = var.price_class

  # Preserve the existing placeholder origin. The viewer-request function returns before origin access.
  origin {
    domain_name = "example.com"
    origin_id   = "placeholder-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "placeholder-origin"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirect.arn
    }
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
}

resource "aws_route53_record" "apex_a" {
  zone_id = aws_route53_zone.site.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = aws_route53_zone.site.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  zone_id = aws_route53_zone.site.zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.site.zone_id
  name    = local.www_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# ACM uses the same validation record for preview and its wildcard.
resource "aws_route53_record" "preview_a" {
  for_each = toset(local.preview_domains)
  zone_id  = aws_route53_zone.site.zone_id
  name     = each.value
  type     = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "preview_aaaa" {
  for_each = toset(local.preview_domains)
  zone_id  = aws_route53_zone.site.zone_id
  name     = each.value
  type     = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = local.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
