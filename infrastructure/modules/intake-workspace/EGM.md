# modules/intake-workspace

## Overview

This directory currently holds no Terraform configuration and no other source
code. Its only files are a `.gitignore` and a tracked `.terraform.lock.hcl`
provider lock file. The intake workspace resources are declared in the
standalone root at
[../../intake-workspace/EGM.md](../../intake-workspace/EGM.md), which does not
reference this directory.

## Interface

- No variables, outputs, resources, modules, or scripts are defined here; the
  directory contains no `.tf` file. `[.gitignore:.terraform/]`
- `.terraform.lock.hcl` records a selection for one provider,
  `registry.terraform.io/hashicorp/aws`, under the constraint `~> 6.0`.
  `[.terraform.lock.hcl:constraints = "~> 6.0"]`
- Callers: none. No `.tf`, `.mjs`, or `.sh` file in the repository refers to
  `modules/intake-workspace` or declares a `module` block that sources it.
  `[../../intake-workspace/main.tf:resource "aws_s3_bucket" "workspace"]`

## Invariants

- `.terraform/`, state files, plan files, and any `*.tfvars` file placed here
  are git-ignored. `[.gitignore:*.tfvars]`

## Side Effects

- None. Nothing here can be planned, applied, or executed.
  `[.gitignore:*.tfplan]`

## Verification

- Run: `npm test`
