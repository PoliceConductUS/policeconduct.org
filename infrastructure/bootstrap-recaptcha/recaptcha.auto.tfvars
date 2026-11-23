# Desired inputs for this stack. Terraform loads this file on every plan and apply,
# so every checkout and worktree plans against the same values.
# Secrets never go here. This stack takes no secret inputs.

recaptcha_project_id = "ipc-policeconduct"
aws_region           = "us-east-1"

# Keep this list tight. Include local dev hosts only if you need local token generation.
allowed_domains = [
  "www.policeconduct.org",
  "policeconduct.org",
  "localhost",
  "127.0.0.1",
]

service_account_account_id   = "ipc-recaptcha-assessor"
service_account_display_name = "policeconduct reCAPTCHA assessor"
recaptcha_key_display_name   = "policeconduct-site"

# Applied to every AWS resource in this stack.
aws_tags = {
  Project     = "policeconduct.org"
  Environment = "shared"
  Stack       = "bootstrap-recaptcha"
  Repository  = "PoliceConductUS/policeconduct.org"
  ManagedBy   = "Terraform"
}
