terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # This stack has its own state, deliberately.
  #
  # The bootstrap-policeconduct stack has NO state at all (INS-39): the state
  # bucket is empty, there is no backend block, and there is no local state
  # file. Running `terraform apply` there would plan a create-from-scratch of
  # the entire live estate — a second CloudFront distribution, duplicate KMS
  # keys, duplicate buckets. That is why INS-35 was briefly implemented as a
  # hand-run bash script.
  #
  # A script was the wrong instrument. Every resource in this stack is NEW, so
  # it has no import problem and nothing to adopt. Giving it a state file of its
  # own makes `terraform plan` an accurate, reviewable description of what will
  # change, which no bash script can be. The pre-existing resources this stack
  # has to touch (two buckets, two Lambdas) are referenced through data sources
  # and are never created or destroyed from here.
  #
  # Native S3 locking (use_lockfile) rather than a DynamoDB lock table: no new
  # paid resource for a stack with a handful of objects in it.
  backend "s3" {
    bucket       = "policeconduct-tfstate-942370948729"
    key          = "submission-notifications/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}
