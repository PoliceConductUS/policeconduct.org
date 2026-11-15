# Why

Workspaces contain durable evidence and identity mappings that must survive local loss and overwrites.

# What Changes

Add private Terraform-managed S3 storage, environment-scoped access and explicit CLI upload/download/version recovery. Hosting upload entry points require an explicit noninteractive sync decision and prompt interactive users after upload.

# Capabilities

## New Capabilities

- `workspace-sync`: private versioned storage and explicit deployment sync decisions.

# Impact

Workspace CLI and infrastructure; website deployment scripts. No database migration, reset or generated type refresh. Automated deployment now requires an explicit workspace sync decision.

The board authorized initial upload after bucket creation; sync the configured workspace without special folder-name exclusions. The board approved this bucket and transfer spend on 2026-11-14 in INS-154. Provisioning still requires a reviewed account plan and working AWS authentication.
