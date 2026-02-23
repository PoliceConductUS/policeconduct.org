provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.aws_tags
  }
}

provider "google" {
  project = var.gcp_project_id
}

provider "google-beta" {
  project = var.gcp_project_id
}
