#!/usr/bin/env bash
#
# Deploy forms API application code. Terraform owns all Lambda configuration.
# The bootstrap state has been recovered; notification settings must be changed
# through its guarded Terraform apply, never merged by this release script.
# --topic-arn and --recipients assert expected live settings before code writes.
#
# USAGE
#   export AWS_PROFILE=<profile with write access to 942370948729>
#   ./deploy-forms-api.sh --topic-arn <arn> --recipients <csv>
#   ./deploy-forms-api.sh ... --apply        # actually do it
#
# Dry run by default: prints the plan, mutates nothing.
#
set -euo pipefail

readonly EXPECTED_ACCOUNT="942370948729"
readonly PROD_FN="policeconduct-forms-api-prod"
readonly PREVIEW_FN="policeconduct-forms-api-preview"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SRC_DIR="${SCRIPT_DIR}/../lambdas/forms-api"

APPLY=0
TOPIC_ARN=""
RECIPIENTS=""
TARGETS=""

log()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mWARN\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mFATAL\033[0m %s\n' "$*" >&2; exit 1; }
run() {
  if [[ $APPLY -eq 1 ]]; then
    "$@"
  else
    printf '  [dry-run]'; printf ' %q' "$@"; printf '\n'
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)          APPLY=1; shift ;;
    --topic-arn)      TOPIC_ARN="${2:?}"; shift 2 ;;
    --recipients)     RECIPIENTS="${2:?}"; shift 2 ;;
    --only)           TARGETS="${2:?}"; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

command -v aws >/dev/null || die "aws CLI not found"
command -v jq  >/dev/null || die "jq not found"
command -v zip >/dev/null || die "zip not found"

# ---------------------------------------------------------------- preflight --

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
[[ "$ACCOUNT" == "$EXPECTED_ACCOUNT" ]] ||
  die "wrong AWS account: $ACCOUNT (expected $EXPECTED_ACCOUNT). Check AWS_PROFILE."
log "account $ACCOUNT as $(aws sts get-caller-identity --query Arn --output text)"
[[ $APPLY -eq 1 ]] || log "DRY RUN — nothing will be modified. Re-run with --apply."

[[ -n "$TOPIC_ARN" ]] ||
  die "--topic-arn is required. Take it from the submission_notifications_topic_arn output of infrastructure/submission-notifications. Without it the Lambda stores submissions and tells nobody, which is the pre-INS-35 state."
[[ "$TOPIC_ARN" == arn:aws:sns:*:${EXPECTED_ACCOUNT}:* ]] ||
  die "--topic-arn '$TOPIC_ARN' is not an SNS ARN in account $EXPECTED_ACCOUNT."
[[ -n "$RECIPIENTS" ]] ||
  die "--recipients is required. A configured topic with no recipient list in the Lambda means the Resend path has nowhere to send."


# The topic must exist and the recipients must be subscribed to it before the
# Lambda is told to use it. Deploying code that publishes to a topic nobody
# listens to recreates the INS-20 state with extra steps.
aws sns get-topic-attributes --topic-arn "$TOPIC_ARN" >/dev/null 2>&1 ||
  die "topic $TOPIC_ARN does not exist. Apply infrastructure/submission-notifications first."

SUBS="$(aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --output json)"
CONFIRMED="$(jq -r '[.Subscriptions[] | select(.SubscriptionArn | startswith("arn:"))] | length' <<< "$SUBS")"
PENDING="$(jq -r '[.Subscriptions[] | select(.SubscriptionArn == "PendingConfirmation")] | length' <<< "$SUBS")"
log "topic has ${CONFIRMED} confirmed and ${PENDING} pending subscription(s)"
if [[ "$CONFIRMED" -eq 0 ]]; then
  warn "no CONFIRMED subscription on $TOPIC_ARN."
  warn "Someone with access to the recipient mailbox has to click the SNS confirmation link."
  warn "Until they do, the SNS backstop path delivers nothing. The Resend path does not"
  warn "need a click and will still work, so this is a warning and not fatal."
fi

if [[ -n "$TARGETS" ]]; then
  FUNCTIONS="$TARGETS"
else
  # Preview first, always. It runs a byte-identical artifact, so it is an exact
  # rehearsal, and a mistake there costs nothing.
  FUNCTIONS="${PREVIEW_FN},${PROD_FN}"
fi

# Validate every target before publishing versions or updating either function.
# Read only the notification fields; never retrieve or print live secret values.
IFS=',' read -ra _fns <<< "$FUNCTIONS"
for fn in "${_fns[@]}"; do
  case "$fn" in
    "$PREVIEW_FN") expected_label="preview" ;;
    "$PROD_FN") expected_label="" ;;
    *) die "unknown function '$fn'. Expected $PREVIEW_FN or $PROD_FN." ;;
  esac
  settings="$(aws lambda get-function-configuration --function-name "$fn" \
    --query 'Environment.Variables.{topic:SUBMISSION_NOTIFICATIONS_TOPIC_ARN,recipients:SUBMISSION_NOTIFICATION_RECIPIENTS,label:NOTIFICATION_ENV_LABEL}' --output json)" ||
    die "cannot read notification configuration for $fn"
  jq -e --arg topic "$TOPIC_ARN" --arg recipients "$RECIPIENTS" --arg label "$expected_label" \
    '.topic == $topic and .recipients == $recipients and (.label // "") == $label' \
    <<< "$settings" >/dev/null ||
    die "notification configuration differs for $fn; reconcile bootstrap Terraform before deploying code"
done

# -------------------------------------------------------------------- build --

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT
ZIP="${BUILD_DIR}/forms-api.zip"

log "building deployment package from $SRC_DIR"
# Install exactly the reviewed lockfile; a mismatch must stop before code writes.
( cd "$SRC_DIR" && TMPDIR=/tmp npm ci --omit=dev --no-audit --no-fund >/dev/null )
( cd "$SRC_DIR" && zip -r -X -q "$ZIP" index.mjs package.json native-domexception node_modules )
log "package: $(du -h "$ZIP" | cut -f1)"

# CodeSha256 is NOT comparable across builds — zip metadata varies, so two zips
# of identical source hash differently. The real identity check is the hash of
# the extracted source file.
SRC_SHA="$(shasum -a 256 "${SRC_DIR}/index.mjs" | cut -d' ' -f1)"
log "index.mjs sha256: $SRC_SHA"

# ------------------------------------------------------------------- deploy --

deploy_one() {
  local fn="$1"

  log "--- $fn"

  # Publish a version FIRST so a rollback target exists. Before INS-21 this
  # function had only $LATEST and no published versions, so there was nothing
  # to roll back to at all.
  local rollback
  if [[ $APPLY -eq 1 ]]; then
    rollback="$(aws lambda publish-version --function-name "$fn" \
      --description "pre-INS-35 rollback point" --query Version --output text)"
    log "rollback version: $fn:$rollback"
  else
    log "  [dry-run] would publish a rollback version of $fn"
  fi

  run aws lambda update-function-code --function-name "$fn" --zip-file "fileb://${ZIP}" --output text --query CodeSha256
  run aws lambda wait function-updated --function-name "$fn"

  if [[ $APPLY -eq 1 ]]; then
    log "deployed $fn (rollback: aws lambda update-function-code --function-name $fn --s3-... or re-publish from version $rollback)"
  fi
}

# The validation loop above already rejected any other name.
for fn in "${_fns[@]}"; do
  deploy_one "$fn"
done

# -------------------------------------------------------------- verification --

cat <<VERIFY

Verify — a successful deploy is not evidence that anybody was told. INS-16
exists because a 200 and an id were read as proof of an outcome they did not
prove.

  # The deployed source must match what you just built.
  for fn in $PREVIEW_FN $PROD_FN; do
    url=\$(aws lambda get-function --function-name \$fn --query Code.Location --output text)
    curl -s "\$url" -o /tmp/\$fn.zip && unzip -p /tmp/\$fn.zip index.mjs | shasum -a 256
  done
  # both must print: $SRC_SHA

  # Then submit through the preview form and confirm a message ARRIVED.

VERIFY

[[ $APPLY -eq 1 ]] || log "DRY RUN COMPLETE — nothing was modified."
