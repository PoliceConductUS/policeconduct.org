output "route53_zone_id" {
  description = "Route53 hosted zone ID for iceconduct.org."
  value       = aws_route53_zone.site.zone_id
}

output "route53_name_servers" {
  description = "Route53 nameservers; set these at your registrar for delegation."
  value       = aws_route53_zone.site.name_servers
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN used by CloudFront."
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for the redirect site."
  value       = aws_cloudfront_distribution.redirect.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution hostname."
  value       = aws_cloudfront_distribution.redirect.domain_name
}
