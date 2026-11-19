locals {
  required_services = toset(["recaptchaenterprise.googleapis.com"])

  # Resource name is projects/{project}/keys/{site_key}; last path segment is the site key used by clients.
  site_key = element(
    reverse(split("/", google_recaptcha_enterprise_key.site.name)),
    0,
  )
  # The production and preview forms Lambdas run as separate roles, and both
  # call reCAPTCHA. AWS presents a Lambda's identity as the assumed-role session
  # ARN arn:aws:sts::<account>:assumed-role/<role>/<session>. The provider's
  # attribute.aws_role mapping below drops the session, so these are the values
  # it can hold for the two forms roles.
  forms_lambda_assumed_role_arns = {
    for role_name in [var.aws_forms_lambda_role_name, var.aws_forms_lambda_preview_role_name] :
    role_name => "arn:aws:sts::${data.aws_caller_identity.current.account_id}:assumed-role/${role_name}"
  }
  # One principalSet per forms role, keyed by role name.
  forms_lambda_principal_sets = {
    for role_name, assumed_role_arn in local.forms_lambda_assumed_role_arns :
    role_name => "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/attribute.aws_role/${assumed_role_arn}"
  }
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
  description                        = "Trust AWS IAM principals from the forms Lambda roles."

  # Google's default AWS mapping, written out because the condition and the
  # principalSet grants below depend on attribute.aws_role.
  attribute_mapping = {
    "google.subject"        = "assertion.arn"
    "attribute.aws_account" = "assertion.account"
    "attribute.aws_role"    = "assertion.arn.contains('assumed-role') ? assertion.arn.extract('{account_arn}assumed-role/') + 'assumed-role/' + assertion.arn.extract('assumed-role/{role_name}/') : assertion.arn"
  }

  # Only the forms Lambda roles may exchange AWS credentials in this pool.
  attribute_condition = "attribute.aws_role in ${jsonencode(values(local.forms_lambda_assumed_role_arns))}"

  aws {
    account_id = data.aws_caller_identity.current.account_id
  }
}

resource "google_service_account_iam_member" "recaptcha_assessor_wif_user" {
  for_each = local.forms_lambda_principal_sets

  service_account_id = google_service_account.recaptcha_assessor.name
  role               = "roles/iam.workloadIdentityUser"
  member             = each.value

  depends_on = [
    google_project_iam_member.recaptcha_assessor_role,
    google_iam_workload_identity_pool_provider.aws,
  ]
}

resource "google_service_account_iam_member" "recaptcha_assessor_token_creator" {
  for_each = local.forms_lambda_principal_sets

  service_account_id = google_service_account.recaptcha_assessor.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = each.value

  depends_on = [
    google_project_iam_member.recaptcha_assessor_role,
    google_iam_workload_identity_pool_provider.aws,
  ]
}
