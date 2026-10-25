#!/usr/bin/env bash
#
# Deploy the forms API Lambda: code, and the environment variables that point it
# at the submission notifications topic.
#
# WHY THIS SCRIPT EXISTS, when the INS-35 infrastructure is plain Terraform
# -------------------------------------------------------------------------
# The infrastructure is applied with `terraform apply` in
# infrastructure/submission-notifications. This is not infrastructure. The
# forms API Lambda is an APPLICATION, its code lives in this repo, and the repo
# has no deploy automation for it at all — the CloudFront static site has
# scripts/deploy-*.sh, and /api has nothing. Every forms API deploy to date has
# been a hand-typed sequence of four AWS CLI calls.
#
# That is not a theoretical problem. On 2026-08-24 the INS-21 deploy ran those
# calls by hand, updated preview at 16:34, and the session died at 16:46 before
# prod. The remaining step existed only in a running process, so it evaporated;
# prod stayed unfixed for 23 days and the issue read as done. This script makes
# the sequence one step, which is the actual fix for that.
#
# It is also why the environment update has to be a script and not Terraform:
# the bootstrap stack that declares this Lambda has no state (INS-39), so
# applying it is not an option, and the Lambda's environment holds live secrets
# that a careless replace would wipe. This merges.
#
# USAGE
#   export AWS_PROFILE=<profile with write access to 942370948729>
#   ./deploy-forms-api.sh --topic-arn <arn> --recipients <csv> --receipts-since <YYYY-MM-DD>
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
RECEIPTS_SINCE=""
TARGETS=""

# Lifetime of a submission verification link, in seconds.
#
# This has to be set here, and it is the reason INS-89's window change can take
# effect at all. The Lambda reads EMAIL_VERIFICATION_TTL_SECONDS from its
# environment and only falls back to the constant in index.mjs when the variable
# is absent. The deployed environment has carried 900 since the feature shipped,
# the bootstrap stack that declares this Lambda has no Terraform state (INS-39)
# so applying it is not an option, and the merge below preserves every existing
# key by design. Shipping the new default in code alone would therefore have
# left the live window at 15 minutes while every test and every user-facing
# string said 24 hours — a worse state than the bug, because it reads as fixed.
#
# Keep equal to DEFAULT_VERIFICATION_TTL_SECONDS in lambdas/forms-api/index.mjs,
# which carries the reasoning for the value itself.
VERIFICATION_TTL_SECONDS="86400"

log()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mWARN\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mFATAL\033[0m %s\n' "$*" >&2; exit 1; }
# Echo a command for dry-run WITHOUT printing secret values.
#
# This exists because the naive version leaked. The merged Lambda environment
# is passed as a literal argument and contains RESEND_API_KEY and
# EMAIL_VERIFICATION_HMAC_SECRET, so `printf '%s' "$*"` wrote both secrets to
# the terminal, to any CI log, and to any agent transcript capturing stdout.
# A dry run is the mode people run casually and paste the output of, which
# makes it the worst possible place to print a secret.
#
# Any argument that parses as a Lambda environment object is reduced to its key
# names -- the only part a reader needs in order to check that the merge kept
# everything it should.
redact_arg() {
  local arg="$1"
  if [[ "$arg" == '{"Variables":'* ]]; then
    printf '{"Variables": <%s keys: %s>}' \
      "$(jq -r '.Variables | keys | length' <<<"$arg")" \
      "$(jq -r '.Variables | keys | join(", ")' <<<"$arg")"
  else
    printf '%s' "$arg"
  fi
}

run() {
  if [[ $APPLY -eq 1 ]]; then
    "$@"
  else
    local out="" a
    for a in "$@"; do out+=" $(redact_arg "$a")"; done
    printf '  [dry-run]%s\n' "$out"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)          APPLY=1; shift ;;
    --topic-arn)      TOPIC_ARN="${2:?}"; shift 2 ;;
    --recipients)     RECIPIENTS="${2:?}"; shift 2 ;;
    --receipts-since) RECEIPTS_SINCE="${2:?}"; shift 2 ;;
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
[[ "$RECEIPTS_SINCE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
  die "--receipts-since must be YYYY-MM-DD (the date the notification path went live)."

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

# -------------------------------------------------------------------- build --

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT
ZIP="${BUILD_DIR}/forms-api.zip"

log "building deployment package from $SRC_DIR"
# npm ci fails here on a package-name mismatch between package.json and the
# lockfile; npm install is the working recipe. No devDependencies exist, so
# --omit=dev leaves a prod-only tree.
( cd "$SRC_DIR" && TMPDIR=/tmp npm install --omit=dev --no-audit --no-fund >/dev/null )
( cd "$SRC_DIR" && zip -r -X -q "$ZIP" index.mjs package.json node_modules )
log "package: $(du -h "$ZIP" | cut -f1)"

# CodeSha256 is NOT comparable across builds — zip metadata varies, so two zips
# of identical source hash differently. The real identity check is the hash of
# the extracted source file.
SRC_SHA="$(shasum -a 256 "${SRC_DIR}/index.mjs" | cut -d' ' -f1)"
log "index.mjs sha256: $SRC_SHA"

# ------------------------------------------------------------------- deploy --

deploy_one() {
  local fn="$1" label="$2"

  aws lambda get-function-configuration --function-name "$fn" >/dev/null 2>&1 || {
    warn "$fn not found; skipping"
    return 0
  }

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

  # Environment: MERGE, never replace. This env holds RESEND_API_KEY, the
  # token-signing EMAIL_VERIFICATION_HMAC_SECRET and the KMS key ids. A replace
  # takes form submission down entirely.
  local current merged
  current="$(aws lambda get-function-configuration --function-name "$fn" \
    --query 'Environment.Variables' --output json)"
  merged="$(jq -c \
    --arg topic "$TOPIC_ARN" \
    --arg recips "$RECIPIENTS" \
    --arg since "$RECEIPTS_SINCE" \
    --arg label "$label" \
    --arg ttl "$VERIFICATION_TTL_SECONDS" \
    '. + {
       SUBMISSION_NOTIFICATIONS_TOPIC_ARN: $topic,
       SUBMISSION_NOTIFICATION_RECIPIENTS: $recips,
       NOTIFICATION_RECEIPTS_SINCE: $since,
       EMAIL_VERIFICATION_TTL_SECONDS: $ttl
     } + (if $label == "" then {} else {NOTIFICATION_ENV_LABEL: $label} end)' \
    <<< "$current")"

  # Report the window change explicitly. A number that moves silently inside a
  # merged environment object is how 900 survived in production while the code
  # and the copy said otherwise; see VERIFICATION_TTL_SECONDS above.
  local current_ttl
  current_ttl="$(jq -r '.EMAIL_VERIFICATION_TTL_SECONDS // "unset"' <<< "$current")"
  if [[ "$current_ttl" != "$VERIFICATION_TTL_SECONDS" ]]; then
    log "  verification link TTL: ${current_ttl}s -> ${VERIFICATION_TTL_SECONDS}s"
  else
    log "  verification link TTL: ${VERIFICATION_TTL_SECONDS}s (unchanged)"
  fi

  # Sanity check the merge before sending it: the keys that were there must
  # still be there.
  local before after
  before="$(jq -r 'keys | length' <<< "$current")"
  after="$(jq -r 'keys | length' <<< "$merged")"
  [[ "$after" -ge "$before" ]] ||
    die "environment merge for $fn would DROP variables ($before -> $after). Refusing."

  run aws lambda update-function-code --function-name "$fn" --zip-file "fileb://${ZIP}" --output text --query CodeSha256
  run aws lambda wait function-updated --function-name "$fn"
  run aws lambda update-function-configuration --function-name "$fn" \
    --environment "{\"Variables\":${merged}}" --output text --query LastModified
  run aws lambda wait function-updated --function-name "$fn"

  if [[ $APPLY -eq 1 ]]; then
    log "deployed $fn (rollback: aws lambda update-function-code --function-name $fn --s3-... or re-publish from version $rollback)"
  fi
}

IFS=',' read -ra _fns <<< "$FUNCTIONS"
for fn in "${_fns[@]}"; do
  case "$(echo "$fn" | xargs)" in
    "$PREVIEW_FN") deploy_one "$PREVIEW_FN" "preview" ;;
    "$PROD_FN")    deploy_one "$PROD_FN" "" ;;
    *) die "unknown function '$fn'. Expected $PREVIEW_FN or $PROD_FN." ;;
  esac
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

  # Run the liveness check now rather than waiting for the schedule.
  # deliveryProbe.status must read 'delivered' — 'accepted' means the transport
  # took the message, not that it arrived.
  aws lambda invoke --function-name policeconduct-notification-canary \\
    --payload '{}' /dev/stdout

  # Then submit through the preview form and confirm a message ARRIVED.

VERIFY

[[ $APPLY -eq 1 ]] || log "DRY RUN COMPLETE — nothing was modified."
