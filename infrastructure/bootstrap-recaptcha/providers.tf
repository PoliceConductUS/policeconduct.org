provider "aws" {
  region              = var.aws_region
  allowed_account_ids = ["942370948729"]

  default_tags {
    tags = var.aws_tags
  }
}

provider "google" {
  project = var.recaptcha_project_id
}

provider "google-beta" {
  project = var.recaptcha_project_id
}
