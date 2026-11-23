# Plan

1. Remove the daily delivery probe in code and Terraform, keep verified-submission notifications, run scoped checks, and merge (done: PR #30).
2. Clean up what PR #30 left: the probe's log group and `.gitignore` line, unreachable forms API branches, and stale approval and caller text in the notification docs (tasks.md section 2).
3. Apply `infrastructure/bootstrap-policeconduct` from `main` through `scripts/apply.sh` (the submission-notifications apply is done) and check the result in AWS (tasks.md section 3).
4. Validate the final head, finish the retrospective, and archive after `notify-staff-after-verification` (tasks.md section 4).
