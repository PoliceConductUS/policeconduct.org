# Design

One website-managed bucket, dev/, preview/, production/ prefixes, versioning, SSE-S3, blocked public access, owner-enforced ownership, TLS-only access, prevent_destroy, force_destroy=false, no expiry lifecycle. Three dedicated per-environment IAM roles require account-authorized AssumeRole permission. Their policies grant only the selected workspace prefix. No hosting or CloudFront grants.

CLI: `npm run workspace:push -- [--dry-run]` and `npm run workspace:pull -- [--dry-run]`. INTAKE_WORKSPACE supplies the existing local directory. Reject root/home and symlink workspace roots, and validate remote destination paths before writes. Delegate local enumeration to AWS sync with --no-follow-symlinks; do not scan or count local files. Require bucket workspace tag and Enabled versioning before transfer. Use AWS s3 sync with default size/timestamp comparison and --dryrun for previews, retain destination-only files, stop on first failure and report partial completion. Download and version restoration back up local workspace to a sibling directory before any local replacement. No data generation or database writes.

Recovery: `npm run workspace:versions -- --bucket NAME --key RELATIVE` lists versions; `npm run workspace:restore -- ... --version-id ID [--dry-run]` restores the selected version locally using the same safeguards. S3 original versions remain untouched.

Deployment: WORKSPACE_SYNC=upload|skip required without a TTY; interactive unset prompts after successful hosting upload. Upload requires INTAKE_WORKSPACE, INTAKE_WORKSPACE_BUCKET. All deployments use the configured workspace leaf folder name. A declined choice exits successfully; sync failure reports hosting upload succeeded and exits nonzero. Preflight catches missing automated choice before hosting writes. No prompt on failed upload or dry-run. Operators must select the workspace that produced the build and keep it quiescent through upload.

The board authorized initial upload after bucket creation; sync the configured workspace without special folder-name exclusions. The board approved this bucket and transfer spend on 2026-11-14 in INS-154. Provisioning still requires a reviewed account plan and working AWS authentication.

Operator commands are one-way push and pull with no environment argument. There is no standalone workspace infrastructure command or npm workspace:sync alias. Infrastructure uses the existing project Terraform workflow. Safety validation runs automatically before transfers.

Every transfer copies the entire configured INTAKE_WORKSPACE to/from the S3 prefix matching the configured directory leaf name. It does not infer a parent directory. INTAKE_WORKSPACE already identifies the full workspace; no environment folder is appended or selected. Existing environment roles remain prefix-scoped; other workspace names require credentials authorized for that prefix.

## Standalone workspace infrastructure

The board authorized deleting and rebuilding the workspace infrastructure on 2026-11-15. Move its resources directly into infrastructure/intake-workspace, with independent state and no website module caller. Push/pull resolve the bucket output from that root. Delete only the former workspace resources and versions; local intake data and other website infrastructure remain intact. Restore deletion protection in the rebuilt stack. Cloud execution remains pending authenticated plan inspection.
