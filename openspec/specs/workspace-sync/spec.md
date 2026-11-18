# workspace-sync Specification

## Purpose

Preserve private intake workspace files and their revisions in environment-specific storage, with explicit upload and download commands and recoverable versions.

## Requirements

### Requirement: Private durable workspace storage

The system SHALL retain all S3 object revisions in a website-managed encrypted private bucket, isolate dev/, preview/, production/ access, prohibit public hosting access and protect deletion. It MUST NOT expire versions without board authorization.

#### Scenario: Environment access

- **WHEN** a preview operator writes workspace data
- **THEN** only preview/ is writable and production/ is inaccessible through its workspace policy.

### Requirement: Explicit safe sync

The CLI SHALL require direction, bucket and an existing INTAKE_WORKSPACE directory, validate local and remote paths before writes, provide dry-run and visible failures, preserve all evidence and mapping bytes, and never delete destination-only files or invoke generation/database writes.

#### Scenario: Download overwrite

- **WHEN** download replaces a local file
- **THEN** the previous local workspace is retained in a reported sibling backup directory.

#### Scenario: Invalid path

- **WHEN** the selected workspace root is a symlink or a remote key contains traversal
- **THEN** sync fails before any transfer writes.

The board authorized initial upload after bucket creation; sync the configured workspace without special folder-name exclusions. The board approved bucket and initial-transfer spending on 2026-11-14.

### Requirement: Revision recovery

The CLI SHALL list versions for an exact environment key and restore an explicitly chosen version locally without deleting any S3 version.

#### Scenario: Recover overwrite

- **WHEN** a file is uploaded twice and its first version is restored
- **THEN** its original bytes are recovered and both remote versions remain available.

### Requirement: npm operator commands

Operators SHALL use `npm run workspace:push` for local-to-S3 copies and `npm run workspace:pull` for S3-to-local copies, with optional `--dry-run`. Commands SHALL load existing dotenv configuration and resolve the bucket from INTAKE_WORKSPACE_BUCKET or the existing Terraform output, fail visibly on missing configuration, and print concise dry-run summaries without shell redirection.

#### Scenario: Dev dry run

- **WHEN** the operator runs npm run workspace:push -- --dry-run
- **THEN** configuration and storage validation run, AWS sync counts planned transfers, and no files transfer.

#### Scenario: Configured workspace

- **WHEN** push or pull runs
- **THEN** the entire configured INTAKE_WORKSPACE directory maps to the S3 prefix matching its leaf folder name, preserving relative subfolders
- **AND** environment arguments are rejected before transfer

### Requirement: Existing infrastructure workflow

Infrastructure SHALL remain in the existing project Terraform workflow with no standalone workspace infrastructure command.

#### Scenario: Infrastructure changes

- **WHEN** an operator provisions workspace storage
- **THEN** the standalone infrastructure/intake-workspace Terraform root in the website repository owns its resources and state

### Requirement: Automatic storage validation

Automatic pre-transfer validation SHALL verify purpose, versioning, public-access blocking and AES256 encryption without transferring files.

#### Scenario: Invalid storage configuration

- **WHEN** a required storage safeguard is absent
- **THEN** push or pull fails before transferring workspace files

### Requirement: Incremental one-way transfers

Push and pull SHALL use AWS `s3 sync` with its default size/timestamp comparison, without `--delete`. Dry runs SHALL use the same sync arguments with `--dryrun` and count actual planned operations. Unchanged files can be skipped; this is not content-hash deduplication.

#### Scenario: Repeated sync

- **WHEN** AWS considers source and destination unchanged
- **THEN** no transfer occurs and push creates no additional object version

### Requirement: Delegate workspace enumeration

The wrapper SHALL pass the workspace directory directly to AWS sync without recursively enumerating local files. AWS SHALL skip symlinks using --no-follow-symlinks.

#### Scenario: Large evidence directory

- **WHEN** a nested directory contains more files than the JavaScript argument limit
- **THEN** push dry-run invokes AWS sync directly without a local directory scan or stack overflow

### Requirement: Visible transfer progress

Push and pull SHALL print startup and validation status immediately, display source and destination before transfer, stream AWS transfer progress and errors live, and report completion including zero transfers. Pull SHALL announce remote path validation and local backup before those stages run.

#### Scenario: Transfer still running

- **WHEN** AWS emits progress before exiting
- **THEN** the operator sees it immediately, without waiting for the completion summary

### Requirement: Exclude Finder metadata

Push and pull SHALL exclude files named `.DS_Store` at the workspace root and every nested depth, including dry runs. Existing destination copies SHALL remain untouched.

#### Scenario: Finder metadata alongside evidence

- **WHEN** push or pull encounters root or nested `.DS_Store` files
- **THEN** those files are not transferred and other workspace files remain eligible for sync
