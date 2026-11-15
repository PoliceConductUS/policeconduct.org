# Implementation plan

1. Write failing CLI tests for direction, environment, invalid paths, recovery and failures; implement narrow filesystem and AWS adapters.
2. Define and validate Terraform resources with no provisioning or remote state writes.
3. Write failing deployment decision tests; integrate both upload sites and delegated preview build.
4. Run non-sensitive fixture demonstration and required repository checks; inspect a plan and estimate storage/request/version costs.
5. Record exact cross-repository heads and PRs. Request concrete spend authorization only after code and verification are reviewable.

The board authorized initial upload after bucket creation; sync the configured workspace without special folder-name exclusions. The board approved this bucket and transfer spend on 2026-11-14 in INS-154. Provisioning still requires a reviewed account plan and working AWS authentication.
