# Verification

## PR #30 head, before merge (2026-10-26)

- 35 forms API tests passed. ESLint, OpenSpec validation, `terraform validate`, `terraform fmt`, shell syntax, and diff checks passed.
- `terraform plan` for `infrastructure/submission-notifications`: 0 to add, 1 to change, 16 to destroy. The change removed the `submissions/2` rule from the production submissions bucket. The plan did not change the preview bucket, so its notification rules already matched the code. The tasks.md section 3 bucket check covers both buckets.
- The 16 destroyed addresses:
  - `aws_lambda_function.canary` (`policeconduct-notification-canary`)
  - `aws_lambda_permission.canary`
  - `aws_cloudwatch_event_rule.canary` (`rate(1 day)`)
  - `aws_cloudwatch_event_target.canary`
  - `aws_iam_role.canary`
  - `aws_iam_role_policy.canary`
  - `aws_sns_topic.canary_alerts` (`policeconduct-notification-canary-alerts`)
  - `aws_sns_topic_subscription.canary_alerts` (one endpoint)
  - `aws_cloudwatch_metric_alarm.canary_delivery` (`policeconduct-notification-canary-delivery-failed`)
  - `aws_cloudwatch_metric_alarm.submissions_without_notification` (`policeconduct-submissions-without-notification`)
  - `aws_cloudwatch_log_metric_filter.notify["publish_failed"]`, `["topic_not_configured"]`, `["nobody_told"]`
  - `aws_cloudwatch_metric_alarm.notify["publish_failed"]`, `["topic_not_configured"]`, `["nobody_told"]` (`policeconduct-forms-api-prod-notify-*`; these AWS names now belong to the kept bootstrap `forms_api_prod_notify_failed` resources, so these six are checked by state only)

## After merge

- 2026-11-18, `ddl-openspec` head `1c1bb48`: `terraform plan` for `infrastructure/submission-notifications` shows 0 to add, 2 to change (tags, and a topic policy refresh with unchanged statements), 0 to destroy. None of the 16 addresses above are in state. The owner applied it the same day from that plan; the plan was made at `1c1bb48`, and no other commit for the apply is recorded.
- 2026-11-18: the owner applied `infrastructure/bootstrap-policeconduct`. That apply still kept the probe's log group; tasks.md section 2 removes it from `logs.tf` and section 3 applies that removal.
- 2026-11-18, head `1c1bb48`: `node --test` in `infrastructure/bootstrap-policeconduct/lambdas/forms-api/`: 48 tests, 48 pass, 0 skipped.

## Pending

Section 2 cleanup pull request, `verify_commands`, AWS not-found checks, bootstrap apply that deletes the probe's log group, forms API deploy check, preview submission, and `npm run validate` on the final head (tasks.md sections 2 to 4).
