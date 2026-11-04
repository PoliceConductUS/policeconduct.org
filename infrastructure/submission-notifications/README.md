# Submission notifications

Staff are notified after email verification. The forms API sends metadata through
Resend and SNS; an S3 notification on `submissions/status/` provides a second path.
Initial submission writes do not notify staff. Notifications contain no request
content. Receipt records do not establish that anyone reviewed the request.

No scheduled monitor remains in this stack. Its Lambda, schedule, IAM resources,
alert topic/subscription, metrics, alarms, tests, and provider configuration are
removed. The actual notification topic, staff subscriptions, bucket notifications,
and forms API remain.

## Deploy

Use the existing S3-backed state for this stack. Review `terraform plan` before
applying. Manual merge and production deployment require approval. Do not apply
the separate bootstrap stack, whose state recovery remains outstanding.

The forms API deployment script accepts `--topic-arn` and `--recipients`, with
`--only policeconduct-forms-api-preview` for preview. It removes the unused
receipt-cutoff environment value on the next deployment. It no longer invokes
a monitor or accepts a cutoff argument.

## Verify

Check that the staff SNS subscription is confirmed and both buckets notify only
on `submissions/status/`. Submit a clearly synthetic request through the preview
form with reCAPTCHA intact. Confirm the submitter verification email, no staff
notification before verification, and staff notification after verification.
Record receipt metadata only. Never use synthetic production requests.

Code deletion does not prove AWS resource deletion. Verify the retired resources
are absent after the approved apply. Historical secret cleanup remains INS-78.
