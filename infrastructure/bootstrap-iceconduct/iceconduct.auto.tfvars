# Desired inputs for this stack. Terraform loads this file on every plan and apply,
# so every checkout and worktree plans against the same values.
# Secrets never go here: tokens and API keys come from the git-ignored .env files.

aws_region          = "us-east-1"
domain_name         = "iceconduct.org"
redirect_target_url = "https://www.policeconduct.org/federal/u-s-immigration-and-customs-enforcement/"
project_name        = "iceconduct-redirect"
price_class         = "PriceClass_100"

tags = {
  ManagedBy = "Terraform"
  Project   = "iceconduct.org"
  Stack     = "bootstrap-iceconduct"
}
