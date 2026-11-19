## Verification

### PR #29 (merged 2026-10-25, `b1e12ad`)

- Forms API Lambda unit suite passed, including the tests that received and unexpected events do not notify staff and that verified events still do. Browser tests did not run, so the full suite was not green at merge.

### Final head (task 1.5)

- Commit: [SHA]. Branch: [branch]. Runtime: Node [version from `mise.toml`]; `npm ci` matched the lockfile.
- `npm run validate`: exit [code]. Stages: [each stage and result]. Tests: [counts]. Skipped: [each skip and reason, or none].
- Warnings and hints: [each one and its disposition, or none].
- CI for this head: [status and link].

### Production (tasks 2.1-2.4)

- 2026-11-18: `infrastructure/submission-notifications` and `infrastructure/bootstrap-policeconduct` applied; both forms Lambdas have `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` set.
- [Bucket notification configuration, synthetic preview result, and the task 2.4 deploy.]
