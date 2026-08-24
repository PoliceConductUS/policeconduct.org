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
commitment is satisfied only by someone remembering to go read a bucket.

## Shape

Two independent paths write to one SNS topic,
`policeconduct-submission-notifications`:

| Path | Fires on | Subject line | Depends on |
|---|---|---|---|
| Lambda `sns:Publish` | submission stored; verification completed | `[DSAR] dataSubjectAccessRequest received <id>` | forms-api code being correct |
| S3 event notification | `ObjectCreated` under `submissions/2*` and `submissions/status/` | generic `Amazon S3 Notification` | nothing but the bucket |

Both are on purpose. The Lambda path is the one that carries a usable subject
line — an S3 event notification email is generic JSON and cannot name the form
type in its subject, so it alone cannot satisfy the "distinguish a DSAR without
opening the object" requirement. The S3 path is the one that survives a bug in
the Lambda, which is the exact class of failure that produced this issue.

Expect **two emails per event**. If you ever see the S3 one arrive without the
Lambda one, the application path is broken.

## The two events

1. **received** — the submission object is written. For a DSAR this is when the
   clock starts (INS-16 §2), verified or not.
2. **verified** — the submitter confirmed their email; `submissions/status/<id>.json`
   is written. This is a state change on something you have already been told
   about, not a first sighting.

## What the notification does and does not contain

Contains: event type, form name, submission id, timestamp, bucket, S3 key.

Does not contain: any submitter-supplied field. No names, no contact details,
no free text. Submissions concern named human beings and are stored under a KMS
key with deliberate access controls; relaying their contents to an email list
would route around all of that. The notification is a pointer. Read the object
in S3.

## Enabling it

Set at least one endpoint:

```hcl
submission_notification_email_endpoints = ["someone@example.org"]
```

With the list empty, **none** of this is created — no topic, no bucket
notification, no alarms, and the Lambda logs `forms.notify.topic_not_configured`
on every submission. That is deliberate. A topic that exists with zero
subscribers is what INS-20 found, and from the console it reads as working.

Each endpoint must confirm the SNS subscription by clicking a link in an email
AWS sends to it. That confirmation click is itself the evidence that a human
reads the mailbox — an unconfirmed subscription receives nothing, and shows as
`PendingConfirmation` in `aws sns list-subscriptions-by-topic`.

## Preview

The preview Lambda publishes to the same topic with `NOTIFICATION_ENV_LABEL=preview`,
which prefixes the subject with `[PREVIEW]`. This exists so the pipe can be
exercised end to end without writing a synthetic DSAR into the production
submissions store — a fake request naming a fake person, in a queue that is
being worked for legal deadlines, is not something to create casually, and
nothing in this repo can delete it afterwards.

## Alarms

Two CloudWatch alarms watch the notification path itself, and both route to the
submission notifications topic rather than the general alerts topic:

- `policeconduct-forms-api-prod-notify-publish-failed` — a submission stored but
  the notification failed to publish.
- `policeconduct-forms-api-prod-notify-topic-not-configured` — the pre-INS-35
  silent-intake state reasserting itself.

Both alarm at a threshold of 1. One missed submission is already too many.

They key off the `msg` field of structured log lines (`forms.notify.publish_failed`,
`forms.notify.topic_not_configured`). **Renaming those log lines silently
disables the alarms.** There is a unit test asserting the exact string for that
reason.

## Verifying it after a change

```bash
# Every endpoint must be Confirmed. PendingConfirmation means nobody is told.
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:942370948729:policeconduct-submission-notifications \
  --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output table

# The bucket must have both filters. An empty result is the INS-20 state.
aws s3api get-bucket-notification-configuration \
  --bucket policeconduct-submissions-942370948729
```

Then submit through the preview form and confirm a message actually arrived.
Configuration that reads as correct is not evidence — INS-16 exists because a
`200` and an id were taken as proof of persistence and were wrong three times
over.

## Known gap

`policeconduct-alerts`, the general infrastructure alerts topic, has **zero
subscriptions** as of 2026-08-24. Every Lambda error, throttle, latency and
verification-email-failure alarm in this stack currently fires into nothing.
That is a separate problem from this one and is not fixed here.
