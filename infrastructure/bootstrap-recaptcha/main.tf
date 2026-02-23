locals {
  required_services = toset(["recaptchaenterprise.googleapis.com"])

  # Resource name is projects/{project}/keys/{site_key}; last path segment is the site key used by clients.
  site_key = element(
    reverse(split("/", google_recaptcha_enterprise_key.site.name)),
    0,
  )
}

resource "google_project_service" "required" {
  for_each = local.required_services

  project = var.gcp_project_id
  service = each.value

  disable_on_destroy = false
}

resource "google_recaptcha_enterprise_key" "site" {
  provider = google-beta

  project      = var.gcp_project_id
  display_name = var.recaptcha_key_display_name
  labels       = var.labels

  web_settings {
    integration_type = "SCORE"
    allowed_domains  = var.allowed_domains
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "recaptcha_assessor" {
  project      = var.gcp_project_id
  account_id   = var.service_account_account_id
  display_name = var.service_account_display_name
}

resource "google_project_iam_member" "recaptcha_assessor_role" {
  project = var.gcp_project_id
  role    = "roles/recaptchaenterprise.agent"
  member  = "serviceAccount:${google_service_account.recaptcha_assessor.email}"
}

resource "google_service_account_key" "recaptcha_assessor" {
  service_account_id = google_service_account.recaptcha_assessor.name
  private_key_type   = "TYPE_GOOGLE_CREDENTIALS_FILE"
}

resource "aws_secretsmanager_secret" "recaptcha_service_account" {
  name                    = var.service_account_secret_name
  description             = "Google service account credentials for reCAPTCHA Enterprise assessments."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "recaptcha_service_account" {
  secret_id     = aws_secretsmanager_secret.recaptcha_service_account.id
  secret_string = base64decode(google_service_account_key.recaptcha_assessor.private_key)

  depends_on = [google_project_iam_member.recaptcha_assessor_role]
}
