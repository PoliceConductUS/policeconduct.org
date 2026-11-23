## Verification

### PR #29 (merged 2026-10-25, `b1e12ad`)

- Forms API Lambda unit suite passed, including the tests that received and unexpected events do not notify staff and that verified events still do. Browser tests did not run, so the full suite was not green at merge.

### Final head (task 1.9)

- Commit: [SHA]. Branch: [branch]. Runtime: Node [version from `mise.toml`]; `npm ci` matched the lockfile.
- `npm run validate`: exit [code]. Stages: [each stage and result]. Tests: [counts]. Skipped: [each skip and reason, or none].
- Tasks 1.5 and 1.6 tests: [each test name and result].
- Warnings and hints: [each one and its disposition, or none].
- CI for this head: [status and link].

### Production (tasks 2.1-2.5)

- 2026-11-18: the owner applied `infrastructure/submission-notifications` (plan at `ddl-openspec` head `1c1bb48`: 0 to add, 2 to change, 0 to destroy; see `openspec/changes/retire-daily-delivery-probe/verify.md`) and `infrastructure/bootstrap-policeconduct`. Topic ARN check pending (task 2.4).
- Task 2.3 deploy: [`main` commit; `index.mjs` sha256 the script printed; deployed `index.mjs` sha256 for preview and for production].
- Task 2.4 topic ARN: [the `submission_notifications_topic_arn` output; the value on each forms Lambda].
- Task 2.5 synthetic preview: [each pass item; the notification receipt key; no request content].
