# Terraform Bootstrap (reCAPTCHA Enterprise)

This stack is intentionally independent from AWS bootstrap stacks.
It manages Google Cloud reCAPTCHA Enterprise resources only:

- Enables required API (`recaptchaenterprise.googleapis.com`)
- Creates a reCAPTCHA Enterprise web score site key
- Creates a dedicated Google service account for assessments
- Grants the service account `roles/recaptchaenterprise.agent`
- Creates a Google Workload Identity Pool + AWS provider for keyless auth
- Grants the AWS forms Lambda role `roles/iam.workloadIdentityUser` on the service account

## Usage

```bash
cd infrastructure/bootstrap-recaptcha
cp terraform.tfvars.example terraform.tfvars
terraform init
bash scripts/apply.sh
```

`scripts/apply.sh` also syncs Terraform outputs into `.env-recaptcha` at repo root by default.
Use `ENV_FILE_NAME=.env` to write directly into your main env file.

## Authentication Prerequisites (GCP)

This stack uses Google providers and requires a valid `gcloud` login and
Application Default Credentials (ADC) in the shell where Terraform runs.

Before `apply`, run:

```bash
gcloud auth login --update-adc
gcloud auth application-default login
gcloud config set project ipc-policeconduct
gcloud auth application-default set-quota-project ipc-policeconduct
```

Recommended API enablement check:

```bash
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  recaptchaenterprise.googleapis.com \
  --project ipc-policeconduct
```

## Troubleshooting

### Error: `invalid_grant` / `invalid_rapt`

Symptom from Terraform/google provider:

- `oauth2: "invalid_grant" "reauth related error (invalid_rapt)"`

Cause:

- Your `gcloud` user session/ADC token has expired or requires re-auth/MFA.

Fix:

```bash
gcloud auth login --update-adc
gcloud auth application-default login
```

If it still fails, hard reset auth state:

```bash
gcloud auth revoke --all
gcloud auth application-default revoke
gcloud auth login --update-adc
gcloud auth application-default login
```

Quick verification:

```bash
gcloud auth list
gcloud auth application-default print-access-token >/dev/null && echo "ADC OK"
```

## Output Wiring

The sync script writes:

- `RECAPTCHA_PROJECT_ID`
- `RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`
- `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`
- `RECAPTCHA_WIF_AUDIENCE`

These canonical env vars map directly to AWS bootstrap Terraform inputs during apply.
