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

### Delivery evidence

Resend sends the staff notification after verification. A provider accepting a
message is not proof that a human received it. Obtain receipt evidence from the
recipient during preview acceptance testing; automated delivery probing is retired.

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
3. Exercise a synthetic request through the preview form with reCAPTCHA intact.
   Confirm the submitter verification email, no staff notification before
   verification, and the staff notification after verification. Record receipt
   metadata only; never inspect existing request contents.

## Scheduled reconciliation

The existing Lambda and EventBridge schedule remain for key-only reconciliation.
The job compares submission keys with notification receipt keys and alerts on
missing receipts. It does not send synthetic mail, call Resend, or hold a mail
provider credential. A receipt indicates a notification attempt, not human
review, action, or a decision to ignore a submission. Those remain manual.

INS-94 retires the delivery-only alarm and metric publication. Historical
CloudWatch datapoints age out under the provider's retention policy. The shared
schedule, IAM role, alert topic, and reconciliation alarm remain. Removing the
delivery alarm also removes its missing-data watchdog; this change makes no
claim of end-to-end monitoring or mailbox delivery verification.

## Retirement deployment

Review the Terraform plan before applying it. Expect the reconciliation Lambda
code/environment update, a schedule description update, and deletion of the
single delivery-only alarm. The schedule must remain enabled, and no intake
Lambda, submission bucket, recipient subscription, or reconciliation alarm may
be removed. Drop the retired sender/key inputs from local tfvars without printing
those values. Historical state-secret remediation remains tracked separately.

Merge and production deployment retain their existing human approval gates.
After deployment, verify the delivery alarm is absent, the Lambda environment
has no mail-provider credential, the schedule remains enabled, and a direct
reconciliation invocation emits no provider send/status calls. Code deletion
alone is not evidence of deployed retirement.

## Further reading

`DESIGN.md` in this directory — the per-path failure analysis, receipt layout,
alarm/log-line coupling, and the limits of key reconciliation.

## Related

- INS-16 — DSAR queue operating procedure, and the 5-business-day standard
- INS-20 — the original finding: the store told nobody
- INS-39 — bootstrap stack has no Terraform state
- INS-55 — `policeconduct.org` mail lives in a Workspace tenant IPC does not own
- INS-58 — a monitor must not report into the channel it monitors
