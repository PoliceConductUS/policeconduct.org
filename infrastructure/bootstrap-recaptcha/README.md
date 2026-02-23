# Terraform Bootstrap (reCAPTCHA Enterprise)

This stack is intentionally independent from AWS bootstrap stacks.
It manages Google Cloud reCAPTCHA Enterprise resources only:

- Enables required API (`recaptchaenterprise.googleapis.com`)
- Creates a reCAPTCHA Enterprise web score site key
- Creates a dedicated Google service account for assessments
- Grants the service account `roles/recaptchaenterprise.agent`
- Creates an AWS Secrets Manager secret containing the service account JSON key

## Usage

```bash
cd infrastructure/bootstrap-recaptcha
cp terraform.tfvars.example terraform.tfvars
terraform init
bash scripts/apply.sh
```

`scripts/apply.sh` also syncs Terraform outputs into `.env-recaptcha` at repo root by default.
Use `ENV_FILE_NAME=.env` to write directly into your main env file.

## Output Wiring

The sync script writes:

- `RECAPTCHA_ENTERPRISE_PROJECT_ID`
- `PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_SECRET_ARN`
- `TF_VAR_recaptcha_enterprise_project_id`
- `TF_VAR_public_recaptcha_site_key`
- `TF_VAR_recaptcha_service_account_secret_arn`

These map directly to existing AWS bootstrap variables/env wiring for the forms API.
