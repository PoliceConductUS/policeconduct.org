output "recaptcha_enterprise_project_id" {
  description = "Google Cloud project ID for reCAPTCHA Enterprise."
  value       = var.gcp_project_id
}

output "recaptcha_enterprise_site_key" {
  description = "Site key value used by browser-side Enterprise script render/execute."
  value       = local.site_key
}

output "recaptcha_enterprise_key_resource_name" {
  description = "Full GCP resource name for the reCAPTCHA Enterprise key."
  value       = google_recaptcha_enterprise_key.site.name
}

output "recaptcha_service_account_email" {
  description = "Google service account email used by forms API."
  value       = google_service_account.recaptcha_assessor.email
}

output "recaptcha_service_account_secret_arn" {
  description = "AWS Secrets Manager ARN containing the Google service account JSON."
  value       = aws_secretsmanager_secret.recaptcha_service_account.arn
}
