## Why

The board removed notification monitoring from scope (INS-94). That monitoring was the daily delivery probe: the `policeconduct-notification-canary` Lambda in `infrastructure/submission-notifications`, run once a day by an EventBridge rule (`rate(1 day)`). Each run sent a test message to the staff recipients through Resend and checked that it was delivered. It also compared stored submissions with notification receipts. Its alarms sent to the `policeconduct-notification-canary-alerts` SNS topic.

## Goals

- Remove the daily delivery probe and every resource, setting, test, and document that exists only for it, including its CloudWatch log group and its build-artifact ignore line.
- Keep verified-submission notifications working as they are.

## Non-Goals

- No replacement monitoring.
- No secret cleanup; that is INS-78.
- The forms API failure alarms in `infrastructure/bootstrap-policeconduct` (`forms_api_{prod,preview}_notify_failed`) and the `infrastructure_alerts` topic stay. They alarm on logged `forms.notify.*` failures and run no scheduled check, so they are not the retired probe.

## What Changes

- Delete the probe from `infrastructure/submission-notifications`: the Lambda and its source and tests, the EventBridge rule and target, the Lambda permission, the IAM role and policy, the alert topic and its subscription, and the delivery and reconciliation alarms (PR #30).
- Delete the forms API notify-failure log filters and alarms (`notify[...]`) from the same root. They are replaced by `forms_api_{prod,preview}_notify_failed` in `infrastructure/bootstrap-policeconduct` (commit `1c1bb48`), which this change keeps. verify.md lists all 16 Terraform addresses (PR #30).
- Remove the `notification_receipts_since` variable (the receipt cutoff) from both Terraform roots and the `NOTIFICATION_RECEIPTS_SINCE` setting from both forms API Lambdas (PR #30).
- Remove the `submissions/2` rule from both submissions buckets. The production bucket stops notifying staff when a submission is first stored; staff are notified only by the `submissions/status/` rule and the forms API after verification (PR #30).
- Delete the probe's CloudWatch log group `/aws/lambda/policeconduct-notification-canary` from `infrastructure/bootstrap-policeconduct/logs.tf` (tasks.md section 2).
- Delete the `notification-canary.zip` line from `.gitignore`; no build writes that file (tasks.md section 2).
- Remove forms API branches that only a non-verified notification event can reach. The verified-only gate stays (tasks.md section 2).
- Keep verified-submission notifications, the `submissions/status/` rule, and notification receipts.

## Alternatives

- Disable the schedule and keep the code: rejected. The board asked for removal, and disabled code still needs upkeep.
- Keep the probe's alarms without the probe: rejected. `canary_delivery` and `submissions_without_notification` alarmed only on the probe's results, so with no probe they could never fire.
- Keep the probe's log group: rejected. Nothing writes to it any more, and `logs.tf` keeps its contents forever (`retention_in_days = 0`), so it costs storage and serves no reader.

## Risks

- The probe was the only end-to-end check. Without it, nothing reports an unconfirmed staff subscription, staff email sent to spam, or a verified submission that never produces a notification. The board removed monitoring from scope (INS-94), and this change adds nothing in its place.
- Deleting the probe's log group deletes its old log lines for good.
- The bootstrap apply in tasks.md section 3 is shared with every change merged in PR #58 and also deploys forms API code to production and preview at once. Running it without `scripts/apply.sh` would clear the notification topic on both forms Lambdas.

## Capabilities

### Modified Capabilities

- `submission-notifications` (created when `notify-staff-after-verification` is archived, which happens first): the notification Terraform root has no scheduled monitoring.

## Impact

- Code and Terraform merged in PR #30 (2026-10-26, commit 93b62da). The follow-up cleanup in tasks.md section 2 needs a new pull request.
- Depends on `notify-staff-after-verification` (PR #29), which owns the requirement that staff are notified only after verification, including notification receipts. Archive that change first.
- Terraform roots are applied from `main` after merge; there is no approval gate.
