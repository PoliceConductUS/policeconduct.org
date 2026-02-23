output "recaptcha_project_id" {
  description = "Google Cloud project ID for reCAPTCHA Enterprise."
  value       = var.recaptcha_project_id
}

output "recaptcha_site_key" {
  description = "Site key value used by browser-side Enterprise script render/execute."
  value       = local.site_key
}

output "recaptcha_key_resource_name" {
  description = "Full GCP resource name for the reCAPTCHA Enterprise key."
  value       = google_recaptcha_enterprise_key.site.name
}

output "recaptcha_service_account_email" {
  description = "Google service account email used by forms API."
  value       = google_service_account.recaptcha_assessor.email
}

output "recaptcha_wif_provider_resource_name" {
  description = "GCP resource name for the AWS Workload Identity provider."
  value       = google_iam_workload_identity_pool_provider.aws.name
}

output "recaptcha_wif_audience" {
  description = "Audience value for Google external account auth via WIF."
  value       = "//iam.googleapis.com/${google_iam_workload_identity_pool_provider.aws.name}"
}
