#!/usr/bin/env bash
#
# INS-35 — wire form submissions to a human who is actually told.
#
# WHY THIS IS A SCRIPT AND NOT `terraform apply`
# ----------------------------------------------
# There is no Terraform state for this stack (INS-39). The state bucket
# s3://policeconduct-tfstate-942370948729/ is empty, there is no backend block,
# and there is no local state file. `scripts/apply.sh` — the command the infra
# README tells you to run — would therefore plan a create-from-scratch of the
# entire live stack: a second CloudFront distribution, duplicate KMS keys,
# duplicate buckets. Until state is imported, every infrastructure change has to
# be a targeted API call. The Terraform in main.tf remains the source of truth
# for what SHOULD exist and is what INS-39 will import; this script is how the
# same thing gets applied today without detonating production.
#
# SAFETY
# ------
# - Dry run by default. Nothing mutates without --apply.
# - Refuses to run against the wrong AWS account.
# - Refuses to run with an empty recipient list. A topic with no subscribers is
#   exactly the state INS-20 found, and it reads as working from the console.
# - Refuses to route canary alerts to a mailbox that is also a notification
#   recipient. A monitor that alerts into the channel it monitors is not a
#   monitor (INS-58).
# - Read-only with respect to every stored submission object. This script
#   creates notification plumbing; it never reads, writes, moves or deletes a
#   submission.
# - Writes a rollback record (prior Lambda env, prior code SHA, prior bucket
#   notification config) to ./ins35-rollback-<timestamp>.json BEFORE mutating.
#
# USAGE
#   export AWS_PROFILE=<a profile with write access to 942370948729>
#   ./ins35-apply.sh                      # dry run, prints every call
#   ./ins35-apply.sh --apply              # execute
#
# REQUIRED CONFIGURATION (no defaults — these are decisions, not settings)
#   INS35_RECIPIENTS        comma-separated, who gets told a submission arrived
#   INS35_CANARY_ALERTS     comma-separated, who gets told the pipe is BROKEN.
#                           Must not overlap INS35_RECIPIENTS.
#
set -euo pipefail

readonly EXPECTED_ACCOUNT="942370948729"
readonly REGION="us-east-1"
readonly PROJECT="policeconduct"
readonly SUBMISSIONS_BUCKET="policeconduct-submissions-942370948729"
readonly SUBMISSIONS_BUCKET_PREVIEW="policeconduct-preview-submissions-942370948729"
readonly TOPIC_NAME="${PROJECT}-submission-notifications"
readonly CANARY_TOPIC_NAME="${PROJECT}-notification-canary-alerts"
readonly CANARY_FUNCTION="${PROJECT}-notification-canary"
readonly FORMS_API_PROD="${PROJECT}-forms-api-prod"
readonly FORMS_API_PREVIEW="${PROJECT}-forms-api-preview"

APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_FILE="${SCRIPT_DIR}/ins35-rollback-$(date -u +%Y%m%dT%H%M%SZ).json"

log()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mWARN\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mFATAL\033[0m %s\n' "$*" >&2; exit 1; }

# Every mutating call goes through this. In dry-run it prints and returns.
run() {
  if [[ $APPLY -eq 1 ]]; then
    "$@"
  else
    printf '  [dry-run] %s\n' "$*"
  fi
}

# ---------------------------------------------------------------- preflight --

command -v aws >/dev/null || die "aws CLI not found"
command -v jq  >/dev/null || die "jq not found"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
[[ "$ACCOUNT" == "$EXPECTED_ACCOUNT" ]] || \
  die "wrong AWS account: $ACCOUNT (expected $EXPECTED_ACCOUNT). Check AWS_PROFILE."

CALLER="$(aws sts get-caller-identity --query Arn --output text)"
log "account $ACCOUNT as $CALLER"
[[ $APPLY -eq 1 ]] || log "DRY RUN — nothing will be modified. Re-run with --apply."

: "${INS35_RECIPIENTS:?set INS35_RECIPIENTS — who is told a submission arrived. This is the whole point of the change; there is no safe default.}"
: "${INS35_CANARY_ALERTS:?set INS35_CANARY_ALERTS — who is told the notification path is broken. Must be a different mailbox than INS35_RECIPIENTS.}"

# A monitor that alerts into the channel it monitors dies with that channel.
IFS=',' read -ra _recipients <<< "$INS35_RECIPIENTS"
IFS=',' read -ra _alerts <<< "$INS35_CANARY_ALERTS"
for a in "${_alerts[@]}"; do
  for r in "${_recipients[@]}"; do
    if [[ "$(echo "$a" | tr '[:upper:]' '[:lower:]' | xargs)" == \
          "$(echo "$r" | tr '[:upper:]' '[:lower:]' | xargs)" ]]; then
      die "canary alert address '$a' is also a notification recipient. If that mailbox dies, the alert about it dies too. Use an independent address (ideally a different domain — policeconduct.org mail lives in a Workspace tenant IPC does not own, INS-55)."
    fi
  done
done

RECEIPTS_SINCE="$(date -u +%Y-%m-%d)"
log "recipients:    $INS35_RECIPIENTS"
log "canary alerts: $INS35_CANARY_ALERTS"
log "reconciliation cutoff: $RECEIPTS_SINCE (the 104 pre-existing submissions are INS-16 backlog, not canary findings)"

# ----------------------------------------------------------------- rollback --

log "capturing rollback record -> $ROLLBACK_FILE"

# The forms-api environment holds RESEND_API_KEY and EMAIL_VERIFICATION_HMAC_SECRET
# in plaintext (a standing problem, filed separately — not introduced here). A
# rollback record has to contain the full prior environment to be a real
# rollback, so this file is secret material: created 0600, inside the repo but
# gitignored, and deleted once the change is confirmed good.
umask 077

# An empty bucket notification configuration comes back as an EMPTY STRING, not
# as `{}`. Every one of these is defaulted, because a rollback record that is
# subtly malformed is worse than none — it reads as a safety net and is not one.
json_or() {
  local out fallback="$2"
  out="$(eval "$1" 2>/dev/null || true)"
  [[ -n "${out// }" ]] && echo "$out" || echo "$fallback"
}

jq -n \
  --arg capturedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson prodEnv "$(json_or "aws lambda get-function-configuration --function-name '$FORMS_API_PROD' --query 'Environment.Variables' --output json" 'null')" \
  --argjson prodSha "$(json_or "aws lambda get-function-configuration --function-name '$FORMS_API_PROD' --query 'CodeSha256' --output json" 'null')" \
  --argjson previewEnv "$(json_or "aws lambda get-function-configuration --function-name '$FORMS_API_PREVIEW' --query 'Environment.Variables' --output json" 'null')" \
  --argjson bucketNotify "$(json_or "aws s3api get-bucket-notification-configuration --bucket '$SUBMISSIONS_BUCKET' --output json" '{}')" \
  '{capturedAt: $capturedAt,
    formsApiProdEnv: $prodEnv,
    formsApiProdCodeSha: $prodSha,
    formsApiPreviewEnv: $previewEnv,
    submissionsBucketNotification: $bucketNotify}' \
  > "$ROLLBACK_FILE"

jq -e . "$ROLLBACK_FILE" >/dev/null || die "rollback record is not valid JSON; refusing to proceed"
jq -e '.formsApiProdEnv != null' "$ROLLBACK_FILE" >/dev/null || \
  die "could not read $FORMS_API_PROD environment — without it an env update is not reversible. Check credentials."

# The bucket notification config is a whole-object PUT — it replaces whatever is
# there. INS-20 found it empty. If it is NOT empty now, something else was
# configured in the meantime and blindly overwriting it would silently delete
# someone else's notification path.
EXISTING_NOTIFY="$(jq -r '.submissionsBucketNotification | keys | length' "$ROLLBACK_FILE")"
if [[ "$EXISTING_NOTIFY" != "0" ]]; then
  warn "submissions bucket already has a notification configuration:"
  jq '.submissionsBucketNotification' "$ROLLBACK_FILE" >&2
  die "refusing to overwrite an existing notification configuration. Review it, then merge by hand."
fi

# ------------------------------------------------------------------- topics --

create_topic() {
  local name="$1" arn
  arn="$(aws sns create-topic --name "$name" --query TopicArn --output text 2>/dev/null || true)"
  # create-topic is idempotent and returns the existing ARN, so this is safe to
  # re-run. In dry run we resolve the ARN without creating anything.
  if [[ -z "$arn" || "$arn" == "None" ]]; then
    arn="arn:aws:sns:${REGION}:${ACCOUNT}:${name}"
  fi
  echo "$arn"
}

if [[ $APPLY -eq 1 ]]; then
  TOPIC_ARN="$(create_topic "$TOPIC_NAME")"
  CANARY_TOPIC_ARN="$(create_topic "$CANARY_TOPIC_NAME")"
else
  TOPIC_ARN="arn:aws:sns:${REGION}:${ACCOUNT}:${TOPIC_NAME}"
  CANARY_TOPIC_ARN="arn:aws:sns:${REGION}:${ACCOUNT}:${CANARY_TOPIC_NAME}"
  log "[dry-run] would create SNS topics $TOPIC_NAME and $CANARY_TOPIC_NAME"
fi
log "topic:        $TOPIC_ARN"
log "canary topic: $CANARY_TOPIC_ARN"

# Let S3 publish into the submissions topic, scoped to this account's buckets.
POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Publish",
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "SNS:Publish",
      "Resource": "${TOPIC_ARN}",
      "Condition": {
        "StringEquals": { "aws:SourceAccount": "${ACCOUNT}" },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::${PROJECT}-*submissions-*"
        }
      }
    },
    {
      "Sid": "AllowAccountPublish",
      "Effect": "Allow",
      "Principal": { "AWS": "${ACCOUNT}" },
      "Action": "SNS:Publish",
      "Resource": "${TOPIC_ARN}"
    }
  ]
}
JSON
)
run aws sns set-topic-attributes --topic-arn "$TOPIC_ARN" \
  --attribute-name Policy --attribute-value "$POLICY"

# ------------------------------------------------------------ subscriptions --
#
# Each of these sends a confirmation email that a human has to click. That click
# is not a formality — it is the only evidence available that somebody actually
# reads the mailbox. An unconfirmed subscription receives nothing and shows as
# PendingConfirmation, so a recipient who never clicks is visibly not covered
# rather than silently uncovered.

subscribe() {
  local topic="$1" endpoint="$2"
  endpoint="$(echo "$endpoint" | xargs)"
  [[ -n "$endpoint" ]] || return 0
  local existing
  existing="$(aws sns list-subscriptions-by-topic --topic-arn "$topic" \
    --query "Subscriptions[?Endpoint=='${endpoint}'].SubscriptionArn" \
    --output text 2>/dev/null || true)"
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    log "already subscribed: $endpoint ($existing)"
    return 0
  fi
  log "subscribing $endpoint to $topic"
  run aws sns subscribe --topic-arn "$topic" --protocol email --notification-endpoint "$endpoint"
}

for r in "${_recipients[@]}"; do subscribe "$TOPIC_ARN" "$r"; done
for a in "${_alerts[@]}";     do subscribe "$CANARY_TOPIC_ARN" "$a"; done

# ------------------------------------------------- S3 event notification -----
#
# The dumb path. It fires on the storage fact itself, so a bug in the Lambda's
# notify code cannot silently swallow an arrival the way one did for six months.
# Its subject line is generic, which is why it is not the only path.

bucket_notification() {
  local bucket="$1"
  local cfg
  cfg=$(cat <<JSON
{
  "TopicConfigurations": [
    {
      "Id": "submission-received",
      "TopicArn": "${TOPIC_ARN}",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": { "Key": { "FilterRules": [ { "Name": "prefix", "Value": "submissions/2" } ] } }
    },
    {
      "Id": "submission-verified",
      "TopicArn": "${TOPIC_ARN}",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": { "Key": { "FilterRules": [ { "Name": "prefix", "Value": "submissions/status/" } ] } }
    }
  ]
}
JSON
)
  # NOTE: no rule matches notifications/, deliberately. A receipt written under
  # a watched prefix would notify about itself in a loop, billed per message.
  log "setting bucket notification on $bucket"
  run aws s3api put-bucket-notification-configuration \
    --bucket "$bucket" --notification-configuration "$cfg"
}

bucket_notification "$SUBMISSIONS_BUCKET"
if aws s3api head-bucket --bucket "$SUBMISSIONS_BUCKET_PREVIEW" 2>/dev/null; then
  bucket_notification "$SUBMISSIONS_BUCKET_PREVIEW"
else
  warn "preview submissions bucket $SUBMISSIONS_BUCKET_PREVIEW not found; skipping"
fi

# ------------------------------------------------------ forms-api wiring -----
#
# Environment only. The function CODE update is deliberately NOT done here —
# see the note at the end.

update_forms_env() {
  local fn="$1" label="$2"
  aws lambda get-function-configuration --function-name "$fn" >/dev/null 2>&1 || {
    warn "$fn not found; skipping"; return 0; }

  local current merged
  current="$(aws lambda get-function-configuration --function-name "$fn" \
    --query 'Environment.Variables' --output json)"
  # Merge, never replace: this function's env holds the Resend key, the HMAC
  # secret and the KMS key ids. A replace would take the site down.
  merged="$(jq -c \
    --arg topic "$TOPIC_ARN" \
    --arg recips "$INS35_RECIPIENTS" \
    --arg since "$RECEIPTS_SINCE" \
    --arg label "$label" \
    '. + {
       SUBMISSION_NOTIFICATIONS_TOPIC_ARN: $topic,
       SUBMISSION_NOTIFICATION_RECIPIENTS: $recips,
       NOTIFICATION_RECEIPTS_SINCE: $since
     } + (if $label == "" then {} else {NOTIFICATION_ENV_LABEL: $label} end)' \
    <<< "$current")"

  log "updating env on $fn"
  run aws lambda update-function-configuration --function-name "$fn" \
    --environment "{\"Variables\":$merged}"
}

update_forms_env "$FORMS_API_PROD" ""
update_forms_env "$FORMS_API_PREVIEW" "preview"

# ------------------------------------------------------------ canary --------

log "canary Lambda ($CANARY_FUNCTION) and its schedule are NOT created by this script"
cat <<'NOTE'
  The canary needs an execution role (s3:ListBucket on the submissions bucket,
  cloudwatch:PutMetricData, sns:Publish to the canary topic), a packaged
  deployment zip, and an EventBridge schedule. Those are in main.tf. Creating
  IAM roles by hand is how state drifts furthest from Terraform, and the canary
  is the one component that is useless if it is subtly wrong. Create it from
  main.tf once INS-39 imports state, or by explicit review — not by a script
  that nobody has been able to test end to end.

  Until it exists, the notification path has no liveness assertion, which is the
  bar the Executive Director set on 2026-09-16.
NOTE

# ------------------------------------------------------------ verification --

log "verification (run these after applying, and BEFORE calling this done)"
cat <<VERIFY

  # 1. Every recipient must show Confirmed. PendingConfirmation means that
  #    person has not clicked, and is therefore not being told anything.
  aws sns list-subscriptions-by-topic --topic-arn ${TOPIC_ARN} \\
    --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output table

  # 2. The bucket must have both rules. An empty result is the INS-20 state.
  aws s3api get-bucket-notification-configuration --bucket ${SUBMISSIONS_BUCKET}

  # 3. A real submission through the preview form, then confirm a message
  #    ARRIVED. Not that the config looks right — INS-16 exists because a 200
  #    and an id were read as proof of an outcome they did not prove.

VERIFY

log "rollback record: $ROLLBACK_FILE"
[[ $APPLY -eq 1 ]] || log "DRY RUN COMPLETE — nothing was modified."
