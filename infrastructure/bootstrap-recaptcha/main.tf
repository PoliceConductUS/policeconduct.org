locals {
  required_services = toset(["recaptchaenterprise.googleapis.com"])

  # Resource name is projects/{project}/keys/{site_key}; last path segment is the site key used by clients.
  site_key = element(
    reverse(split("/", google_recaptcha_enterprise_key.site.name)),
    0,
  )
  forms_lambda_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.aws_forms_lambda_role_name}"
}

data "aws_caller_identity" "current" {}

resource "google_project_service" "required" {
  for_each = local.required_services

  project = var.recaptcha_project_id
  service = each.value

  disable_on_destroy = false
}

resource "google_recaptcha_enterprise_key" "site" {
  provider = google-beta

  project      = var.recaptcha_project_id
  display_name = var.recaptcha_key_display_name
  labels       = var.labels

  web_settings {
    integration_type = "SCORE"
    allowed_domains  = var.allowed_domains
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "recaptcha_assessor" {
  project      = var.recaptcha_project_id
  account_id   = var.service_account_account_id
  display_name = var.service_account_display_name
}

resource "google_project_iam_member" "recaptcha_assessor_role" {
  project = var.recaptcha_project_id
  role    = "roles/recaptchaenterprise.agent"
  member  = "serviceAccount:${google_service_account.recaptcha_assessor.email}"
}

resource "google_iam_workload_identity_pool" "aws" {
  project                   = var.recaptcha_project_id
  workload_identity_pool_id = var.workload_identity_pool_id
  display_name              = var.workload_identity_pool_display_name
  description               = "AWS federation for policeconduct.org forms API."
}

resource "google_iam_workload_identity_pool_provider" "aws" {
  project                            = var.recaptcha_project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.aws.workload_identity_pool_id
  workload_identity_pool_provider_id = var.workload_identity_provider_id
  display_name                       = var.workload_identity_provider_display_name
  description                        = "Trust AWS IAM principals from the forms Lambda role."

  aws {
    account_id = data.aws_caller_identity.current.account_id
  }
}

resource "google_service_account_iam_member" "recaptcha_assessor_wif_user" {
  service_account_id = google_service_account.recaptcha_assessor.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/*"

  depends_on = [
    google_project_iam_member.recaptcha_assessor_role,
    google_iam_workload_identity_pool_provider.aws,
  ]
}

resource "google_service_account_iam_member" "recaptcha_assessor_token_creator" {
  service_account_id = google_service_account.recaptcha_assessor.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/*"

  depends_on = [
    google_project_iam_member.recaptcha_assessor_role,
    google_iam_workload_identity_pool_provider.aws,
  ]
}
