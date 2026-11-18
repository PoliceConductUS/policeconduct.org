# Terraform Bootstrap (reCAPTCHA Enterprise)

This stack is intentionally independent from AWS bootstrap stacks.
It manages Google Cloud reCAPTCHA Enterprise resources only:

- Enables required API (`recaptchaenterprise.googleapis.com`)
- Creates a reCAPTCHA Enterprise web score site key
- Creates a dedicated Google service account for assessments
- Grants the service account `roles/recaptchaenterprise.agent`
- Creates a Google Workload Identity Pool + AWS provider for keyless auth
- Grants the AWS forms Lambda role `roles/iam.workloadIdentityUser` on the service account

## Existing state is required

The apply wrapper refuses missing, unreadable, empty, or data-only state before
applying. Bind this checkout to the authoritative
state before using the wrapper. Do not initialize a fresh local state for an
existing deployment. This guard does not prove state completeness or identity;
inspect the plan against the known project and resources before applying.

## Remote state

The authoritative state uses the existing protected S3 bucket
`policeconduct-tfstate-942370948729`, key
`bootstrap-recaptcha/terraform.tfstate`, with encryption and native S3 locking.
Terraform 1.11 or later is required. The existing state has been migrated.
Other checkouts must run `terraform init -reconfigure` with this configuration
and verify the remote resources before planning or applying. Do not migrate a
stale local copy over the remote state or initialize an empty replacement.

For recovery, retrieve a specific S3 object version into a private file and
compare lineage, resources and outputs before any restoration. Keep state and
backup files out of Git. Stop concurrent Terraform operations before migration
or recovery; never replay a plan created before either operation.

## Account binding

The AWS provider accepts only account `942370948729`, which supplies the
workload-identity federation trust. The Google project input accepts only
`ipc-policeconduct`. These checks also apply to direct Terraform plans; changing
shell defaults cannot silently redirect this existing stack to another account
or project. Google credentials still require access to the configured project.

## Usage

```bash
cd infrastructure/bootstrap-recaptcha
terraform init
bash scripts/apply.sh
```

If you want the full infrastructure bootstrap in the correct order across stacks, run the repo-level wrapper from the project root:

```bash
bash scripts/bootstrap-all.sh
```

That wrapper runs this stack first and then `infrastructure/bootstrap-policeconduct/scripts/apply.sh`.

The policeconduct stack and the site scripts read this stack's outputs at run time through `scripts/terraform-outputs.mjs`.

The inputs for this stack are tracked in `recaptcha.auto.tfvars`, which Terraform loads on every plan and apply. Secrets never go in that file.

Before it changes anything, `scripts/apply.sh` writes one plan and refuses it when it destroys or replaces a resource whose address is not listed, one per line, in `TERRAFORM_APPROVED_DESTROYS`. It then asks for `yes` and applies exactly that plan. When live infrastructure already matches, it applies nothing.

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

No script writes these values to a file. `scripts/terraform-outputs.mjs` reads them from this stack's Terraform outputs at run time:

- `RECAPTCHA_PROJECT_ID`
- `RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SERVICE_ACCOUNT_EMAIL`
- `RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME`
- `RECAPTCHA_WIF_AUDIENCE`

`infrastructure/bootstrap-policeconduct/scripts/apply.sh` maps them to that stack's Terraform inputs during apply.
