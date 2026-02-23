# Terraform Bootstrap (iceconduct.org Redirect)

This stack is intentionally independent from `infrastructure/bootstrap-policeconduct`.
It manages only `iceconduct.org` redirect infrastructure:

- Route53 public hosted zone for `iceconduct.org`
- ACM certificate for `iceconduct.org` and `www.iceconduct.org` (us-east-1)
- CloudFront distribution with a viewer-request function returning `301`
- Route53 alias records for apex + `www`

## Usage

```bash
cd infrastructure/bootstrap-iceconduct
cp terraform.tfvars.example terraform.tfvars
terraform init
bash scripts/apply.sh
```

`scripts/apply.sh` also syncs Terraform outputs into `.env-iceconduct` at repo root.

## Delegation

After first apply, update your registrar nameservers for `iceconduct.org` using:

```bash
terraform -chdir=infrastructure/bootstrap-iceconduct output route53_name_servers
```

Then re-run apply until ACM status is issued and CloudFront deployment completes.
