# modules

## Overview

Groups reusable Terraform module directories for the `infrastructure/` roots. It
has no files of its own and one subdirectory, which at present contains no
Terraform configuration.

## Subdirectories & Boundaries

- intake-workspace: [./intake-workspace/EGM.md](./intake-workspace/EGM.md) —
  holds only a `.gitignore` and an AWS provider lock file; defines no variables,
  outputs, or resources and has no callers.
