# ---------------------------------------------------------------------------
# Submission notifications and their liveness check (INS-35).
#
# Before this, a form submission landed in the submissions bucket and no human
# was told: empty bucket notification config, no consumer, zero subscribers on
# any topic (INS-20). As of 2026-10-24 that store holds 138 submissions,
# 23 of them data subject access requests, and nobody was ever notified of one.
#
# Two independent paths tell a human, because one path is a single point of
# failure and the failure mode is silent:
#
#   forms-api Lambda -> Resend     subject line names the form type, so a DSAR
#                                  is identifiable without opening the object,
#                                  and the transport reports per-message
#                                  delivery status.
#   S3 event        -> SNS -> email  generic subject, but it fires on the
#                                  storage fact itself and therefore survives a
#                                  bug anywhere in the Lambda.
#
# Expect two messages per event. Seeing the SNS one without the Resend one
# means the application path is broken, visible from the inbox.
#
# Nothing here reads a submission. The notifications carry form type, id,
# timestamp, bucket and key — no name, no contact detail, no free text.
# Submissions concern named human beings and sit under a KMS key with
# deliberate access controls; relaying their contents to a mailing list would
# route around all of it (same boundary as INS-9).
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

# Fail at plan time rather than applying into the wrong account.
check "correct_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == var.aws_account_id
    error_message = "Caller is in account ${data.aws_caller_identity.current.account_id}, expected ${var.aws_account_id}. Check AWS_PROFILE."
  }
}

data "aws_s3_bucket" "submissions" {
  bucket = var.submissions_bucket
}

data "aws_s3_bucket" "submissions_preview" {
  bucket = var.submissions_bucket_preview
}

locals {
  recipients = distinct([
    for e in var.submission_notification_recipients : trimspace(e) if trimspace(e) != ""
  ])
  canary_alert_endpoints = distinct([
    for e in var.notification_canary_alert_endpoints : trimspace(e) if trimspace(e) != ""
  ])
  canary_metric_namespace = "PoliceConduct/Notifications"
  # Single source of truth for the metric dimension. The canary stamps every
  # datapoint with Environment=<this>, and the alarms must match it exactly or
  # they watch a series nothing writes to. See the comment on
  # aws_cloudwatch_metric_alarm.canary_delivery.
  canary_environment = "production"
}

# ------------------------------------------------------------------- topics --

resource "aws_sns_topic" "submission_notifications" {
  name = "${var.project_name}-submission-notifications"
}

# Separate topic from the submissions topic ON PURPOSE. The same topic would
# mean the alert about a dead channel fans out to the dead channel (INS-58).
resource "aws_sns_topic" "canary_alerts" {
  name = "${var.project_name}-notification-canary-alerts"
}

data "aws_iam_policy_document" "submission_notifications" {
  # Keep the account-owner statement AWS puts on a topic by default. A custom
  # policy replaces it wholesale, and dropping it locks the topic.
  statement {
    sid    = "AllowAccountOwnerManagement"
    effect = "Allow"
    actions = [
      "SNS:GetTopicAttributes",
      "SNS:SetTopicAttributes",
      "SNS:AddPermission",
      "SNS:RemovePermission",
      "SNS:DeleteTopic",
      "SNS:Subscribe",
      "SNS:ListSubscriptionsByTopic",
      "SNS:Publish",
    ]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    resources = [aws_sns_topic.submission_notifications.arn]
  }

  statement {
    sid       = "AllowSubmissionsBucketPublish"
    effect    = "Allow"
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.submission_notifications.arn]

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values = [
        data.aws_s3_bucket.submissions.arn,
        data.aws_s3_bucket.submissions_preview.arn,
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "submission_notifications" {
  arn    = aws_sns_topic.submission_notifications.arn
  policy = data.aws_iam_policy_document.submission_notifications.json
}

# Each subscription sends a confirmation email that a human has to click. That
# click is not a formality — it is the only evidence available that somebody
# actually reads the mailbox. An unconfirmed subscription receives nothing and
# reports PendingConfirmation, so a recipient who never clicks is visibly
# uncovered rather than silently uncovered.
resource "aws_sns_topic_subscription" "submission_notifications" {
  for_each = toset(local.recipients)

  topic_arn = aws_sns_topic.submission_notifications.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "canary_alerts" {
  for_each = toset(local.canary_alert_endpoints)

  topic_arn = aws_sns_topic.canary_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# -------------------------------------------------- bucket event notifications

# The dumb path. It fires on the storage fact, so a bug in the Lambda's publish
# code cannot silently swallow an arrival the way one did for six months.
#
# Prefix filters are literal strings and submission keys are
# submissions/<YYYY-MM-DD>/<formName>/<id>.json — the form name sits in the
# MIDDLE of the key, so it cannot be filtered on here. That is why the Lambda
# path exists too: only a publisher can set a subject line. "submissions/2"
# selects the date-partitioned objects and excludes submissions/status/ and
# submissions/verify/.
#
# No rule matches notifications/, deliberately: a receipt written under a
# watched prefix would notify about itself in a loop, billed per message.
resource "aws_s3_bucket_notification" "submissions" {
  bucket = data.aws_s3_bucket.submissions.id

  topic {
    id            = "submission-received"
    topic_arn     = aws_sns_topic.submission_notifications.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "submissions/2"
  }

  # The verification transition writes submissions/status/<id>.json. A captured
  # but unverified request already starts the DSAR clock (INS-16 §2), so both
  # events have to be visible, not just the first write.
  topic {
    id            = "submission-verified"
    topic_arn     = aws_sns_topic.submission_notifications.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "submissions/status/"
  }

  depends_on = [aws_sns_topic_policy.submission_notifications]
}

resource "aws_s3_bucket_notification" "submissions_preview" {
  bucket = data.aws_s3_bucket.submissions_preview.id

  topic {
    id            = "submission-received"
    topic_arn     = aws_sns_topic.submission_notifications.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "submissions/2"
  }

  topic {
    id            = "submission-verified"
    topic_arn     = aws_sns_topic.submission_notifications.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "submissions/status/"
  }

  depends_on = [aws_sns_topic_policy.submission_notifications]
}

# ------------------------------------------------- forms-api notify alarms ---
#
# These watch the application path from the other side: the Lambda storing a
# submission and then failing to tell anyone. Both route to the submissions
# topic rather than policeconduct-alerts, because the failure they describe is
# "the queue holder stopped being told" and the queue holder is who needs to
# hear it — and because policeconduct-alerts still has zero subscribers
# (verified again 2026-10-24), so routing there would be routing to nowhere.

locals {
  notify_log_metrics = {
    publish_failed = {
      msg         = "forms.notify.publish_failed"
      slug        = "notify-publish-failed"
      description = "A submission was stored but the arrival notification failed to publish. Someone filed something and nobody was told."
    }
    # The pre-INS-35 state reasserting itself: the Lambda ran, the submission
    # stored, and no topic was configured to tell anyone.
    topic_not_configured = {
      msg         = "forms.notify.topic_not_configured"
      slug        = "notify-topic-not-configured"
      description = "The forms API stored a submission with no notification topic configured. This is the INS-20 state recurring."
    }
    nobody_told = {
      msg         = "forms.notify.nobody_told"
      slug        = "notify-nobody-told"
      description = "Both notification paths failed for the same submission. It is stored and no human has been told by any route."
    }
  }
}

resource "aws_cloudwatch_log_metric_filter" "notify" {
  for_each = local.notify_log_metrics

  name           = "${var.project_name}-forms-api-prod-${each.value.slug}"
  log_group_name = "/aws/lambda/${var.forms_api_prod_function_name}"
  pattern        = "{ $.msg = \"${each.value.msg}\" }"

  metric_transformation {
    name      = "${var.project_name}-forms-api-prod-${each.value.slug}"
    namespace = "${var.project_name}/FormsApi"
    value     = "1"
  }
}

# Threshold 1: one submission nobody was told about is already too many.
resource "aws_cloudwatch_metric_alarm" "notify" {
  for_each = local.notify_log_metrics

  alarm_name          = "${var.project_name}-forms-api-prod-${each.value.slug}"
  alarm_description   = each.value.description
  namespace           = "${var.project_name}/FormsApi"
  metric_name         = aws_cloudwatch_log_metric_filter.notify[each.key].metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.submission_notifications.arn]
  ok_actions          = [aws_sns_topic.submission_notifications.arn]
}

# ------------------------------------------------------------------ canary ---
#
# The liveness check. INS-55 and INS-57 were two channels that were believed
# live and had been dead for months, neither self-reporting, both found by
# accident. A notification path that is configured today and silently stops in
# November puts us back exactly there, and the belief that it works will be
# just as reasonable and just as wrong.

data "archive_file" "canary" {
  type        = "zip"
  source_dir  = "${path.module}/notification-canary"
  output_path = "${path.module}/.build/notification-canary.zip"
  # node_modules is excluded so the artifact is DETERMINISTIC: without this the
  # zip silently depends on whether whoever runs the apply happened to have run
  # `npm install` in this directory, so two people applying the same commit can
  # ship different Lambdas.
  #
  # The three @aws-sdk/* clients the canary imports are therefore resolved from
  # the Lambda runtime, which bundles AWS SDK v3 (verified on
  # nodejs:22.mainline.v122). The package.json dependencies exist for local
  # `node --test` only. If a future runtime drops the bundled SDK this breaks
  # at import time on the first scheduled run, and the delivery alarm's
  # treat_missing_data = "breaching" is what reports it.
  excludes = ["*.zip", "index.test.mjs", "node_modules", ".build"]
}

data "aws_iam_policy_document" "canary_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "canary" {
  name               = "${var.project_name}-notification-canary"
  assume_role_policy = data.aws_iam_policy_document.canary_assume_role.json
}

# Deliberately NO s3:GetObject and NO kms:Decrypt. The canary reconciles by
# listing keys, and the submission id and form name are both in the key, so it
# never needs to decrypt anything. Submission contents route to the queue
# holder untouched (INS-9); the cheapest way to guarantee a monitor never reads
# a DSAR is to make it unable to.
data "aws_iam_policy_document" "canary" {
  statement {
    sid    = "CloudWatchLogsWrite"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"]
  }

  statement {
    sid       = "ListSubmissionKeysOnly"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [data.aws_s3_bucket.submissions.arn]
  }

  statement {
    sid       = "PublishCanaryMetrics"
    effect    = "Allow"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = [local.canary_metric_namespace]
    }
  }

  statement {
    sid       = "AlertOutOfBand"
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.canary_alerts.arn]
  }
}

resource "aws_iam_role_policy" "canary" {
  name   = "${var.project_name}-notification-canary"
  role   = aws_iam_role.canary.id
  policy = data.aws_iam_policy_document.canary.json
}

resource "aws_lambda_function" "canary" {
  function_name = "${var.project_name}-notification-canary"
  role          = aws_iam_role.canary.arn
  handler       = "index.handler"
  runtime       = var.lambda_nodejs_runtime

  # The delivery probe polls the transport for a real delivery event rather
  # than assuming an accepted send succeeded, so it needs room to wait.
  timeout = 120

  filename         = data.archive_file.canary.output_path
  source_code_hash = data.archive_file.canary.output_base64sha256

  environment {
    variables = {
      CANARY_ENVIRONMENT                   = local.canary_environment
      SUBMISSIONS_BUCKET                   = data.aws_s3_bucket.submissions.id
      SUBMISSION_NOTIFICATION_RECIPIENTS   = join(",", local.recipients)
      SUBMISSION_NOTIFICATION_FROM_ADDRESS = var.notification_from_address
      RESEND_API_KEY                       = var.resend_api_key
      CANARY_ALERT_TOPIC_ARN               = aws_sns_topic.canary_alerts.arn
      CANARY_ALERT_ENDPOINTS               = join(",", local.canary_alert_endpoints)
      NOTIFICATION_RECEIPTS_SINCE          = var.notification_receipts_since
    }
  }
}

resource "aws_cloudwatch_event_rule" "canary" {
  name                = "${var.project_name}-notification-canary"
  description         = "Assert the submission notification path still reaches a human (INS-35)."
  schedule_expression = var.notification_canary_schedule
}

resource "aws_cloudwatch_event_target" "canary" {
  rule      = aws_cloudwatch_event_rule.canary.name
  target_id = "notification-canary"
  arn       = aws_lambda_function.canary.arn
}

resource "aws_lambda_permission" "canary" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.canary.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.canary.arn
}

# Two consecutive misses, not one. A single slow delivery is not an outage, and
# a monitor that cries wolf gets muted — which is the state we are leaving.
resource "aws_cloudwatch_metric_alarm" "canary_delivery" {
  alarm_name        = "${var.project_name}-notification-canary-delivery-failed"
  alarm_description = "The submission notification path did not deliver to a human on its scheduled check. A submission arriving now would tell nobody (INS-35)."

  namespace   = local.canary_metric_namespace
  metric_name = "CanaryDelivered"

  # REQUIRED, not cosmetic. The canary publishes every datapoint with
  # Dimensions: [{Environment: <env>}], and a CloudWatch alarm only matches
  # datapoints whose dimensions match EXACTLY. Omit this and the alarm watches
  # a dimensionless series nothing ever writes to -- so it reads as configured
  # and is inert.
  #
  # Both alarms in this file shipped that way on 2026-10-25. It was caught only
  # by invoking the canary and then reading the alarm state, rather than
  # trusting that a clean apply meant a working monitor. The
  # submissions-without-notification alarm sat at OK, reason "no datapoints
  # were received", while the canary was publishing a value of 2. That is the
  # subject of INS-35 reproduced inside its own fix.
  dimensions = {
    Environment = local.canary_environment
  }

  statistic           = "Maximum"
  period              = 86400
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"

  # A canary that stops running is the same failure as a canary that fails.
  treat_missing_data = "breaching"

  alarm_actions = [aws_sns_topic.canary_alerts.arn]
  ok_actions    = [aws_sns_topic.canary_alerts.arn]
}

# The check no synthetic message can perform: it runs over real traffic. A
# submission stored with no notification receipt beside it is INS-20 recurring,
# and this is the assertion that would have caught the original backlog.
resource "aws_cloudwatch_metric_alarm" "submissions_without_notification" {
  alarm_name        = "${var.project_name}-submissions-without-notification"
  alarm_description = "A submission was stored with no notification receipt beside it. This is the INS-20 failure recurring: it arrived and nobody was told."

  namespace   = local.canary_metric_namespace
  metric_name = "SubmissionsWithoutNotification"

  # See the dimension comment on canary_delivery. Without this the alarm reads
  # OK forever while submissions go unannounced.
  dimensions = {
    Environment = local.canary_environment
  }

  statistic           = "Maximum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.canary_alerts.arn]
}
