# Intake workspace infrastructure

This standalone Terraform root owns the private workspace bucket and its three
prefix-scoped operator roles. It has independent local Terraform state. Keep
that state private and backed up; run commands from the same feature checkout.
Do not initialize a second empty state against an existing bucket.

From the repository root, using the configured AWS operator profile:

```sh
terraform -chdir=infrastructure/intake-workspace init
terraform -chdir=infrastructure/intake-workspace plan -out=workspace.tfplan
terraform -chdir=infrastructure/intake-workspace apply workspace.tfplan
npm run workspace:push -- --dry-run
npm run workspace:push
```

Push/pull resolve `intake_workspace_bucket_name` from this root. The bucket name
is derived from the authenticated account unless explicitly supplied. The
operator role prefix defaults to `policeconduct-intake-workspace`. Default trust
allows account-authorized principals to assume the roles; their identity policy
must separately grant AssumeRole. Storage remains private, encrypted, versioned,
and protected from deletion. Versions have no expiration.

## Rebuild transition

The board authorized deleting the previous workspace bucket and all its retained
versions, then recreating these resources in this root. The old website root no
longer declares `module.intake_workspace`. The transition must remove exactly its
12 workspace resources from the old state before applying this root. Inspect
both saved plans. Empty all object versions and delete markers only in the
identified workspace bucket; its retention policy must be removed for this
explicitly authorized teardown. Other website resources and local intake data
are outside the deletion scope. The rebuilt root restores retention and deletion
protection. Never run a general website destroy.
