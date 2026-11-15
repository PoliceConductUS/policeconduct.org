terraform {
  backend "s3" {
    bucket              = "policeconduct-tfstate-942370948729"
    key                 = "bootstrap-recaptcha/terraform.tfstate"
    region              = "us-east-1"
    encrypt             = true
    use_lockfile        = true
    allowed_account_ids = ["942370948729"]
  }
}
