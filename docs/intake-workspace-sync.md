# Private intake workspace storage

All infrastructure and commands live in policeconduct.org. The standalone
`infrastructure/intake-workspace` stack owns the private bucket directly. It creates three dedicated operator
roles, one for each of `dev/`, `preview/`, and `production/`. Account principals
need explicit `sts:AssumeRole` permission to use those roles. Hosting deploy roles
and CloudFront receive no workspace access. Outputs identify the bucket, prefixes
and role ARNs.

The bucket uses SSE-S3 encryption, enforced owner ownership, public-access blocks,
TLS-only access, versioning and deletion protection. The bucket policy denies
object/version deletion and lifecycle configuration. There is no expiry rule.
Changing retention requires an explicit board decision and a reviewed Terraform
change. Keep Terraform state securely backed up; `prevent_destroy` does not
protect a resource after its configuration is removed.

## Commands

For the normal operator workflow, configure `AWS_PROFILE` and `INTAKE_WORKSPACE`
in the existing `.env` file. The bucket comes from `INTAKE_WORKSPACE_BUCKET` if
set, otherwise from the existing Terraform `intake_workspace_bucket_name` output.
No shell exports or direct AWS commands are needed:

```sh
npm run workspace:push -- --dry-run
npm run workspace:push
npm run workspace:pull
npm run workspace:pull -- --dry-run
```

Push copies local files to S3; pull copies S3 files to the local workspace.
Each command syncs only the configured `INTAKE_WORKSPACE` directory
with the S3 prefix matching its leaf folder name. For example, `.../dev` maps
to `s3://BUCKET/dev/`, and `.../intake-workspace` maps to
`s3://BUCKET/intake-workspace/`, preserving subfolders. The command never selects
its parent. There is no environment argument or extra environment folder. Existing environment roles remain limited to their own prefixes.
Infrastructure uses the existing project Terraform workflow;
there is no separate workspace infrastructure command. Each transfer validates the
bucket's purpose, versioning, public-access block and AES256 encryption. Dry runs
stream planned file operations and print the source, destination and count. They
perform no transfers. The lower-level commands below remain available for version
recovery and explicit arguments.

Run from this website checkout using Node 26 and AWS CLI v2. Set
`INTAKE_WORKSPACE` to the **existing directory to transfer**. Relative paths resolve from the current working
directory. Select credentials for the matching workspace operator role. Bucket
purpose and Enabled versioning are checked before transfer. The CLI does not use
`INTAKE_WORKSPACE_TEST`.

These are additive file copies, **not atomic snapshots or bidirectional merges**.
Push and pull use AWS `s3 sync`, which skips files based on size and timestamps.
It does not compare every file's contents: identical bytes with newer timestamps
can upload again, and same-sized changes with preserved timestamps can be missed.
Skipped uploads create no new S3 version. Dry runs use the same AWS sync with
`--dryrun` and report the number of planned transfers. S3 retains prior versions
of files that actually upload. For downloads,
before replacing anything, they copy the local workspace into a newly created
sibling backup directory and print its path. A failed backup stops the transfer.
Sync uses one AWS CLI sync invocation. A failed download can leave partial files; restore from the reported local backup before retrying if needed. Single-version recovery replaces its destination only after its download succeeds.
Failures return nonzero and report how many files completed. Reruns can skip unchanged files but
create remote versions for files uploaded again; a partially completed multi-file run is not
rolled back. Destination-only files are never deleted. Empty directories are
not represented in S3. Ensure sufficient disk space for the local backup.

Stop intake writers during sync and ensure no other operator writes the selected
prefix. This command does not generate data, create IDs, parse
or rewrite envelopes, or access a database. Evidence and stable-ID mappings are
copied byte-for-byte. Push skips symlinks; unsafe remote object paths fail before local writes. No folder names are specially excluded; local pre-download backups preserve the entire original workspace. No workspace files are copied into `dist/` or a hosting bucket.

## Local review and validation

```sh
node scripts/workspace-demo.mjs
# Open http://127.0.0.1:8154 and run the fixture recovery.
node --test scripts/intake-workspace-sync.test.mjs
TMPDIR=/tmp terraform -chdir=infrastructure/intake-workspace init -backend=false
TMPDIR=/tmp terraform -chdir=infrastructure/intake-workspace validate
TMPDIR=/tmp terraform -chdir=infrastructure/intake-workspace test -verbose
```

The demo uses synthetic evidence and an in-memory S3 adapter with the real sync
implementation. It never contacts AWS or a database. Its retained revisions,
recovered bytes and local backup result are visible at the loopback URL. Terraform
tests use a mocked provider and cannot create paid resources. A real account plan
must be reviewed separately before apply. No merge or deployment is implied.

## Cost and provisioning gate

AWS's US East (N. Virginia) public price list dated 2026-11-09, retrieved
2026-11-14, lists S3 Standard at $0.023/GB-month for the first 50 TB,
$0.005/1,000 PUT/COPY/POST/LIST requests and $0.0004/1,000 GET/other requests.
Sources: [AWS S3 pricing](https://aws.amazon.com/s3/pricing/) and the
[regional public price list](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json).

For a 10 GB workspace with 100,000 objects, one full upload costs about $0.50 in
PUT requests and adds $0.23/month of retained storage. Thirty uploads add 300 GB
($6.90/month at the end of that month) and $15 in PUT requests. That retained
storage continues into later months; it is not reset monthly. Listing 100,000
objects takes roughly 100 paginated requests; downloading them adds about $0.04
in GET requests plus applicable data-transfer-out charges. Multipart uploads,
retries, storage validation, other environments and taxes add cost. Downloads may incur
internet transfer charges depending on the account's aggregate allowance.
SSE-S3 has no KMS request charges. There is no expiry or cost cap in this module.

The board approved spending for this bucket and initial transfer on 2026-11-14
in INS-154. The initial upload after bucket creation is also authorized. Do not request either approval again. This approval does not authorize
unrelated infrastructure spending, merge, or public-site deployment. Before it, inspect each environment's dry-run;
after it, list remote keys and verify only the intended workspace prefix. Do not upload the parent workspace into a single prefix.

Measured local inventory (2026-11-14, excluding dev-copy): dev has 6,774,263
files / 62,288,143,524 bytes (58.01 GiB); preview and prod are empty.
A full dev upload is approximately $33.87 in PUT requests and $1.33/month
of additional retained storage, excluding multipart/retry overhead. A monthly
full upload repeated 30 times would add about $1,016.14 in PUT requests and
$40.03/month of retained storage. These are estimates, not a spending ceiling.
The parent folder also contains clearinghouse-api and ins81-fatal-force
workspaces; they transfer only when included inside the configured INTAKE_WORKSPACE.

Push passes the configured directory directly to AWS sync without a preliminary recursive file scan or count. AWS skips symlinks via `--no-follow-symlinks`.

Push and pull print startup, storage validation, source and destination immediately, then stream AWS progress and per-file operations live. Pull announces remote validation and backup creation. The completion summary reports the transferred count, including zero when AWS skips everything.

Push and pull exclude `.DS_Store` files at the root and every nested depth, including dry runs. Existing destination copies are left untouched.
