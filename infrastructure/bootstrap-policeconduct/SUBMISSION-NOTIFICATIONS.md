# Submission notifications (INS-35)

## What this exists to prevent

Between the launch of the forms and 2026-08-24, 104 submissions landed in
`policeconduct-submissions-942370948729` and no human was ever told. The bucket
notification config was empty, there was no consumer Lambda, no EventBridge
rule, and zero SNS subscriptions anywhere in the account (INS-20). The only
outbound mail went to the submitter.

Five of those were data subject access requests. Four asked for deletion. The
oldest went unanswered for 179 days.

INS-16 commits the organization to acknowledging a DSAR within 5 business days
of **receipt**. This is the mechanism behind that commitment. Without it the
commitment is satisfied only by someone remembering to go read a bucket — and
the interim manual sweep that stood in for this work ran **1 time out of 8
scheduled executions** before this shipped.

## Shape

Three paths, each covering a failure the others cannot.

| Path | Fires on | Carries | Survives |
|---|---|---|---|
| **Resend email** from the forms Lambda | submission stored; verification completed | `[DSAR] dataSubjectAccessRequest received <id>` | — |
| **SNS topic** publish from the forms Lambda | same two events | subject line + message attributes | a broken email transport |
| **S3 event notification** → SNS | `ObjectCreated` under `submissions/2` and `submissions/status/` | generic `Amazon S3 Notification` | a bug anywhere in the Lambda |

**The human-facing path is Resend, not SNS email.** That is the one design
decision here worth defending. SNS publishes **no delivery status for the
`email` protocol** — a subscription to a mailbox that quietly dies keeps
reporting `Confirmed` forever and nobody finds out. That is not hypothetical:
the IPC Workspace admin mailbox bounced for 3.5 months and was discovered by
accident (INS-55). Resend reports a per-message `last_event` (`delivered`,
`bounced`, …), which turns "is anyone actually receiving this" from a belief
into a fact a machine can check every day. It is also already the transport
behind the submitter verification email, so it adds no vendor and no spend.

The S3 event path remains because it fires on the storage fact itself and
therefore survives a bug in the Lambda — the exact class of failure that
produced this issue. Its subject line is generic, which is why it cannot be the
only path: `submissions/<date>/<formName>/<id>.json` puts the form name in the
*middle* of the key, and S3 prefix filters are literal strings, so no filter
isolates DSARs.

**Expect two emails per event.** If the S3 one ever arrives without the Resend
one, the application path is broken and you can see that from your inbox.

## The two events

1. **received** — the submission object is written. For a DSAR this is when the
   clock starts (INS-16 §2), verified or not.
2. **verified** — the submitter confirmed their email; `submissions/status/<id>.json`
   is written. A state change on something you have already been told about.

## What the notification does and does not contain

Contains: event type, form name, submission id, timestamp, bucket, S3 key.

Does not contain: any submitter-supplied field. No names, no contact details,
no free text. Submissions concern named human beings and are stored under a KMS
key with deliberate access controls; relaying their contents to an email list
would route around all of that. The notification is a pointer. Read the object
in S3.

## Notification receipts

Every notification attempt writes a receipt to
`notifications/{YYYY-MM-DD}/{submissionId}-{eventType}.json` in the submissions
bucket, recording which transports succeeded, the Resend message id, and who was
told. No submission content.

The prefix sits **beside** `submissions/`, never under it, for two reasons:

- a receipt under `submissions/` would match the S3 event filter and notify
  about itself in a loop, billed per message;
- the INS-20 invariant that a count over `submissions/<date>/` is a complete
  count of real submissions has to keep holding.

Receipts are what make the reconciliation below possible. Without them, the only
evidence a notification was attempted is a log line that expires.

## Liveness: the canary (`lambdas/notification-canary`)

A notification path configured today and silently dead in November puts us back
exactly where we started, and the belief that it works will be just as
reasonable and just as wrong. So the path asserts itself on a schedule, and
makes two independent checks:

1. **Delivery probe** — sends a message down the real path to the real
   recipients and requires the transport to confirm it was **delivered**, not
   merely accepted. This is the check that catches a mailbox dying.
2. **Reconciliation** — over **real traffic**, diffs what arrived in
   `submissions/` against the receipts in `notifications/`. A submission with no
   receipt is INS-20 happening again. Synthetic traffic cannot catch this class;
   only the real corpus can.

**The alert goes somewhere the monitored channel's failure cannot reach.** A
canary that emails the dead mailbox is the same failure again (INS-58), so
`notification_canary_alert_endpoints` must not overlap
`submission_notification_email_endpoints` — enforced by a Terraform `validation`
block, by a guard in `scripts/ins35-apply.sh`, and re-checked at runtime by the
canary itself, which puts a warning in the alert body if it ever becomes true.

Because `policeconduct.org` mail lives in a Workspace tenant IPC does not own
(INS-55), a tenant-level failure takes every `policeconduct.org` address at
once. Prefer an alert address on a **different domain**.

### What the canary deliberately does not do

It does not submit through the public form. Every submission path is gated on a
reCAPTCHA Enterprise token, which a scheduled job cannot mint without a browser.
The alternative — a bypass header on the submit endpoint — is the exact class of
hole INS-21 was filed to close, and is not worth building to make a monitor
tidier.

So: the delivery probe covers transport and mailbox; the reconciliation covers
form, storage and notify, against real traffic. Every hop is asserted, but **no
single message traverses all of them at once.** That gap is stated rather than
papered over. Closing it needs either a headless-browser canary or a signed
canary credential on the submit path, and both are larger decisions than this
issue.

### Reconciliation cutoff

`notification_receipts_since` must be set to the date this is applied. The 104
pre-existing submissions have no receipts and never will; without the cutoff the
canary reports them every run and gets muted within a week, which is how
monitors die. Those are INS-16's backlog, worked by a human.

## Enabling it

```hcl
submission_notification_email_endpoints = ["someone@example.org"]
notification_canary_alert_endpoints     = ["someone-else@other-domain.org"]
notification_receipts_since             = "2026-09-16"
```

With the recipient list empty, **none** of this is created — no topic, no bucket
notification, no canary, no alarms — and the Lambda logs
`forms.notify.recipients_not_configured` on every submission. That is
deliberate. A topic that exists with zero subscribers is what INS-20 found, and
from the console it reads as working.

Each SNS endpoint must confirm its subscription by clicking a link. That
confirmation click is itself evidence a human reads the mailbox; an unconfirmed
subscription receives nothing and shows as `PendingConfirmation`.

## Applying it

**Not with `terraform apply`.** There is no Terraform state for this stack
(INS-39): the state bucket is empty, there is no backend block, and there is no
local state file, so `scripts/apply.sh` would plan a create-from-scratch of the
entire live stack — a second CloudFront distribution, duplicate KMS keys,
duplicate buckets.

Use `scripts/ins35-apply.sh`, which makes the same changes as targeted API
calls. It is dry-run by default, refuses the wrong account, refuses an empty
recipient list, refuses a canary alert address that overlaps a recipient,
refuses to overwrite a bucket notification configuration it did not expect, and
writes a rollback record first.

The Terraform here remains the source of truth for what *should* exist and is
what INS-39 will import.

## Alarms

| Alarm | Fires when |
|---|---|
| `…-forms-api-prod-notify-publish-failed` | a submission stored but the notification failed to publish |
| `…-forms-api-prod-notify-topic-not-configured` | the pre-INS-35 silent-intake state reasserting itself |
| `…-notification-canary-delivery-failed` | the path did not deliver to a human, twice running |
| `…-submissions-without-notification` | a submission stored with no receipt beside it |

The first two route to the submissions topic; the canary alarms route to the
independent canary topic. None route to `policeconduct-alerts`, which as of
2026-08-24 has **zero subscriptions** — every Lambda error, throttle and latency
alarm in this stack currently fires into nothing. That is a separate problem and
is not fixed here.

The delivery alarm uses `treat_missing_data = "breaching"`: a canary that stops
running is the same failure as a canary that fails.

The log-line alarms key off the `msg` field of structured log lines
(`forms.notify.publish_failed`, `forms.notify.topic_not_configured`,
`forms.notify.recipients_not_configured`, `forms.notify.nobody_told`).
**Renaming those log lines silently disables the alarms.** There are unit tests
asserting the exact strings for that reason.

## Verifying it after a change

```bash
# Every endpoint must be Confirmed. PendingConfirmation means nobody is told.
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:942370948729:policeconduct-submission-notifications \
  --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output table

# The bucket must have both filters. An empty result is the INS-20 state.
aws s3api get-bucket-notification-configuration \
  --bucket policeconduct-submissions-942370948729

# Run the canary by hand and read the verdict, not the config.
aws lambda invoke --function-name policeconduct-notification-canary \
  --payload '{"runId":"manual"}' /dev/stdout
```

Then submit through the preview form and confirm a message actually **arrived**.
Configuration that reads as correct is not evidence — INS-16 exists because a
`200` and an id were taken as proof of persistence and were wrong three times
over.
