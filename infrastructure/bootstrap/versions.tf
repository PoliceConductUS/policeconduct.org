terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
    external = {
      source  = "hashicorp/external"
      version = ">= 2.3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.5.0"
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.0.0"
    }
  }
}
