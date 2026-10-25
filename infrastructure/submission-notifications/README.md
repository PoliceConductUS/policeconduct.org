# Submission notifications (INS-35)

Tells a human that a form submission arrived, and asserts on a schedule that it
still does.

## What it is for

Before this, a submission landed in `policeconduct-submissions-942370948729`
and no human was told. Empty bucket notification config, no consumer Lambda, no
EventBridge rule, zero SNS subscriptions (INS-20). The only outbound mail went
to the submitter.

As of **2026-10-24** that store holds **138 submissions**, **23** of them data
subject access requests. Nobody was ever notified of a single one. INS-16
commits the organization to acknowledging a DSAR within 5 business days; the
interim control was a human remembering to read a bucket, which achieved 1
execution out of 8.

## Why this is a separate stack

`infrastructure/bootstrap-policeconduct` declares nearly everything else, and
**cannot be applied**. It has no Terraform state at all (INS-39): the state
bucket is empty, there is no backend block, no local state file. `terraform
apply` there plans a create-from-scratch of the live estate — a second
CloudFront distribution, duplicate KMS keys, duplicate buckets.

INS-35 was therefore first written as a hand-run bash script making targeted
API calls. That was the wrong instrument, for two reasons:

1. A script's effect can only be reviewed by reading the script. `terraform
plan` _is_ a reviewable description of what will change.
2. The script could not create the liveness canary at all — an IAM role, a
   packaged Lambda and an EventBridge schedule were out of its reach, and those
   are the parts that make this fix permanent rather than another thing that
   silently stops working.

Every resource here is **new**, so there is nothing to import and no reason to
wait for INS-39. The four pre-existing resources it has to touch (two
submissions buckets, read via data source; the prod forms API log group, by
name) are referenced, never created or destroyed.

The one genuinely cross-cutting change — the forms API Lambda's environment and
its `sns:Publish` grant — stays declared in the bootstrap stack and is applied
by `bootstrap-policeconduct/scripts/deploy-forms-api.sh`, because that Lambda is
an application artifact this stack does not own.

## Two paths, on purpose

| Path                      | Fires on                                                         | Subject                                         | Survives                     |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| forms-api Lambda → Resend | submission write **and** verification transition                 | `[DSAR] dataSubjectAccessRequest received <id>` | —                            |
| S3 event → SNS → email    | `ObjectCreated` under `submissions/2*` and `submissions/status/` | generic `Amazon S3 Notification`                | a bug anywhere in the Lambda |

Expect **two messages per event**. Seeing the SNS one without the Resend one
means the application path is broken, and that is visible from the inbox.

The Lambda path is not optional: only a publisher can set a subject line, and
submission keys are `submissions/<date>/<formName>/<id>.json` — the form name
sits in the _middle_ of the key, and S3 prefix filters are literal strings, so
no bucket-level filter can isolate a DSAR.

### The human-facing path is Resend, not SNS email

**SNS publishes no delivery status for the `email` protocol.** A subscription to
a mailbox that quietly dies reports `Confirmed` forever, and no API will tell
you otherwise. An SNS-email design is therefore _structurally incapable_ of
carrying the liveness signal this issue requires — a canary bolted onto it would
have passed every day while the mailbox was dead, which is exactly the INS-55
failure it is meant to detect.

Resend reports a per-message `last_event` (`delivered`, `bounced`, …). It is
already the transport behind the submitter verification email, so this adds no
vendor and no spend.

## Notifications carry no submission content

Form type, submission id, timestamp, bucket, key. No name, no contact detail,
no free text. Submissions concern named human beings and sit under a KMS key
with deliberate access controls; relaying their contents to a mailing list
would route around all of it.

The canary holds **no `s3:GetObject` and no `kms:Decrypt`** — it reconciles by
listing keys, and both the id and the form name are in the key. The cheapest
way to guarantee a monitor never reads a DSAR is to make it unable to.

## Apply

```bash
export AWS_PROFILE=<profile with write access to 942370948729>
cp terraform.tfvars.example terraform.tfvars   # then fill it in
terraform init
terraform plan -out=ins35.tfplan               # read this before applying
terraform apply ins35.tfplan
```

Then wire the application side:

```bash
cd ../bootstrap-policeconduct/scripts
./deploy-forms-api.sh \
  --topic-arn "$(cd ../../submission-notifications && terraform output -raw submission_notifications_topic_arn)" \
  --recipients hello@policeconduct.org \
  --receipts-since 2026-10-25            # add --apply when the dry run looks right
```

### A human at the recipient mailbox has to act

`terraform apply` creates the SNS subscriptions, but **AWS requires the
recipient to click a confirmation link.** Until somebody with access to
`hello@policeconduct.org` clicks, that subscription reads
`PendingConfirmation` and receives nothing.

This is useful rather than annoying: the click is the only available evidence
that a human actually reads the mailbox, so it settles INS-16 §8 B-A as a side
effect. But it does mean the apply cannot be completed by one person alone. The
Resend path needs no click and works immediately.

## Verify

A correct-looking plan is not evidence that anybody is being told. INS-16 exists
because a `200` and an id were read as proof of an outcome they did not prove.

```bash
terraform output -raw verify_commands
```

Three things to confirm, in order:

1. Every recipient reads `Confirmed`, not `PendingConfirmation`.
2. The bucket notification config has both rules. An empty result is the INS-20
   state.
3. The canary's `deliveryProbe.status` reads **`delivered`**. `accepted` means
   the transport took the message, not that it arrived — treating those as the
   same thing is the mistake INS-16 is about, one layer down.

## What the canary does and does not prove

Two assertions, on a daily schedule:

- **Delivery probe** — sends down the real path to the real recipients and
  requires the transport to confirm _delivered_.
- **Reconciliation** — over **real traffic**, diffs objects under
  `submissions/` against notification receipts under `notifications/`. A
  submission with no receipt is INS-20 recurring. No synthetic message can
  catch that class of failure; only the real corpus can.

**The gap, stated plainly:** there is no synthetic submission through the real
form. Every submission path is gated on a reCAPTCHA Enterprise token, which a
scheduled job cannot mint without a browser. The only ways through are a
headless browser on a schedule, or a bypass header on the submit endpoint — and
a bypass there is the exact class of hole INS-21 was filed to close.

So every hop is covered, but **no single message traverses all of them at
once**: the delivery probe covers transport and mailbox, the reconciliation
covers form, storage and notify. Closing that properly means a headless-browser
canary, which is a larger decision than this change.

The delivery alarm sets `treat_missing_data = "breaching"`: a canary that stops
running is the same failure as a canary that fails.

## Cost

About **$1.10/month**:

- 2 custom metrics published daily by the canary — $0.60
- 5 alarms — $0.50
- 3 log-metric-filter metrics — **$0**, because a log metric filter only
  publishes a data point when its pattern matches, and these patterns match
  only when a notification has failed. They start costing money exactly when
  something has gone wrong, which is the right time to be paying for them.

SNS, EventBridge and Lambda are inside the free tier at this volume, and Resend
adds nothing.

The board approved "roughly $1/month" on 2026-10-25 against a figure of ~$0.80
for 2 metrics and 2 alarms. This stack has 3 more alarms than that estimate (the
notify-failure alarms were counted as one pair, and `nobody_told` was added),
so the real number is ~$1.10. Stated here rather than quietly absorbed.

## Further reading

`DESIGN.md` in this directory — the per-path failure analysis, receipt layout,
alarm/log-line coupling, and what the canary deliberately does not do.

## Related

- INS-16 — DSAR queue operating procedure, and the 5-business-day standard
- INS-20 — the original finding: the store told nobody
- INS-39 — bootstrap stack has no Terraform state
- INS-55 — `policeconduct.org` mail lives in a Workspace tenant IPC does not own
- INS-58 — a monitor must not report into the channel it monitors
