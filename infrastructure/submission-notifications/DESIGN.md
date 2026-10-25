# Submission notifications (INS-35)

## What this exists to prevent

Between the launch of the forms and 2026-10-24, **138 submissions** landed in
`policeconduct-submissions-942370948729` and no human was ever told. The bucket
notification config was empty, there was no consumer Lambda, no EventBridge
rule, and zero SNS subscriptions anywhere in the account (INS-20). The only
outbound mail went to the submitter.

**23 of them are data subject access requests.** When INS-20 found this there
were 5, the oldest unanswered for 179 days. 18 more have arrived since, 12 of
them in the 72 hours before 2026-10-24, and one that landed on 2026-10-10 has
now passed the 5-business-day acknowledgement standard without anyone being
told it existed.

INS-16 commits the organization to acknowledging a DSAR within 5 business days
of **receipt**. This is the mechanism behind that commitment. Without it the
commitment is satisfied only by someone remembering to go read a bucket — and
the interim manual sweep that stood in for this work ran **1 time out of 8
scheduled executions**, and has not run since 2026-09-16.

## Shape

Three paths, each covering a failure the others cannot.

| Path                                        | Fires on                                                        | Carries                                         | Survives                     |
| ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| **Resend email** from the forms Lambda      | submission stored; verification completed                       | `[DSAR] dataSubjectAccessRequest received <id>` | —                            |
| **SNS topic** publish from the forms Lambda | same two events                                                 | subject line + message attributes               | a broken email transport     |
| **S3 event notification** → SNS             | `ObjectCreated` under `submissions/2` and `submissions/status/` | generic `Amazon S3 Notification`                | a bug anywhere in the Lambda |

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
_middle_ of the key, and S3 prefix filters are literal strings, so no filter
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

## Scheduled reconciliation (`notification-canary/`)

The existing resource names are retained so retirement does not replace shared
infrastructure. This Lambda lists submission and notification keys, compares
them, emits `SubmissionsWithoutNotification`, and alerts through the independent
SNS topic. It never reads object bodies or decrypts submissions.

There is no synthetic delivery check. No mail-provider credential, sender,
sending function, status polling, delivery metric, or delivery alarm remains.
The schedule stays enabled because reconciliation still uses it. Receipt
metadata describes a notification attempt, not manual review or handling.

The alert destination must not overlap the intake recipient list. Terraform
validation and the runtime independence check retain that boundary. Human
preview acceptance verifies actual receipt with reCAPTCHA and access controls
intact; it is not a scheduled test or a production synthetic request.

### Reconciliation cutoff

`notification_receipts_since` must be set to the date this is applied. The
pre-existing submissions have no receipts and never will; without the cutoff the
canary reports them every run and gets muted within a week, which is how
monitors die. Those are INS-16's backlog, worked by a human.

## Enabling it

```hcl
submission_notification_recipients  = ["hello@policeconduct.org"]
notification_canary_alert_endpoints = ["dlotts@knightrider.com"]
notification_receipts_since         = "2026-10-25"
```

There are no defaults for those three, and empty lists are rejected by variable
validation. A topic that exists with zero subscribers is what INS-20 found, and
from the console it reads as working — so this stack cannot be applied at all
without naming a human. A second validation refuses a canary alert address that
also appears in the recipient list.

Each SNS endpoint must confirm its subscription by clicking a link. That
confirmation click is itself evidence a human reads the mailbox; an unconfirmed
subscription receives nothing and shows as `PendingConfirmation`. It also means
**the apply cannot be finished by one person alone** — somebody with access to
the recipient mailbox has to click. The Resend path needs no click.

## Applying it

`terraform apply`, in this directory. See the README.

This used to be a hand-run script (`ins35-apply.sh`, deleted), because the
resources were declared in `bootstrap-policeconduct`, which cannot be applied —
it has no Terraform state (INS-39), so `terraform apply` there plans a
create-from-scratch of the entire live estate.

The fix was to stop borrowing that stack's problem. Everything here is a new
resource with nothing to import, so it has its own S3-backed state, and the
pre-existing resources it touches are read through data sources. Against the
live account the plan reads **21 to add, 0 to change, 0 to destroy** — which a
script could never have demonstrated about itself.

What remains hand-applied is the forms API Lambda, via
`../bootstrap-policeconduct/scripts/deploy-forms-api.sh`. That Lambda belongs to
the stateless stack and is an application artifact, so Terraform is not an
option for it until INS-39 imports state.

## Alarms

| Alarm                                          | Fires when                                                 |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `…-forms-api-prod-notify-publish-failed`       | a submission stored but the notification failed to publish |
| `…-forms-api-prod-notify-topic-not-configured` | the pre-INS-35 silent-intake state reasserting itself      |
| `…-forms-api-prod-notify-nobody-told`          | both paths failed for the same submission                  |
| `…-submissions-without-notification`           | a submission stored with no receipt beside it              |

The notify alarms route to the submissions topic; the canary alarms route to the
independent canary topic. None route to `policeconduct-alerts`, which as of
2026-10-24 still has **zero subscriptions** — every Lambda error, throttle and latency
alarm in this stack currently fires into nothing. That is a separate problem and
is not fixed here.

The reconciliation alarm retains its existing missing-data behavior. Delivery
watchdog coverage is retired, not replaced by a claim of mailbox monitoring.

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
