# Terraform Bootstrap (iceconduct.org Redirect)

> **State recovery required before apply.** The existing infrastructure must not
> be bootstrapped again with empty state. `scripts/apply.sh` now refuses missing,
> unreadable, invalid, or managed-instance-free state before any apply work.
> Passing this guard proves only that some managed state exists, not that recovery
> is complete. Do not apply until resource-by-resource reconciliation and a reviewed
> plan show no unexpected creates, replacements, or destroys. Do not bypass the
> wrapper with a direct `terraform apply`.
>
> Backend location, AWS identity, and live resources must be verified before
> configuring or migrating state. Never commit state files or plan JSON: they can
> contain credentials. Recovery remains outstanding; these usage examples are not
> authorization to recreate the live stack.

This stack is intentionally independent from `infrastructure/bootstrap-policeconduct`.
It manages only `iceconduct.org` redirect infrastructure:

- Route53 public hosted zone for `iceconduct.org`
- ACM certificate for `iceconduct.org` and `www.iceconduct.org` (us-east-1)
- CloudFront distribution with a viewer-request function returning `301`
- Route53 alias records for apex + `www`

## Usage

```bash
cd infrastructure/bootstrap-iceconduct
terraform init
bash scripts/apply.sh
```

The inputs for this stack are tracked in `iceconduct.auto.tfvars`, which Terraform loads on every plan and apply.

Before it changes anything, `scripts/apply.sh` writes one plan and refuses it when it destroys or replaces a resource whose address is not listed, one per line, in `TERRAFORM_APPROVED_DESTROYS`. It then asks for `yes` and applies exactly that plan. When live infrastructure already matches, it applies nothing.

## Delegation

After first apply, update your registrar nameservers for `iceconduct.org` using:

```bash
terraform -chdir=infrastructure/bootstrap-iceconduct output route53_name_servers
```

Then re-run apply until ACM status is issued and CloudFront deployment completes.
