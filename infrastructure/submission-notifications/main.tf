# Verified-submission notifications. No scheduled monitoring.

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

}

# ------------------------------------------------------------------- topics --

resource "aws_sns_topic" "submission_notifications" {
  name = "${var.project_name}-submission-notifications"
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

# -------------------------------------------------- bucket event notifications

# Only verification status writes notify staff. Initial submission writes must
# not trigger the raw S3 path before email verification. Keep the independent
# status-write backstop; notification receipts remain outside this prefix.
resource "aws_s3_bucket_notification" "submissions" {
  bucket = data.aws_s3_bucket.submissions.id

  # saveSubmissionStatus is called only after successful verification.
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
    id            = "submission-verified"
    topic_arn     = aws_sns_topic.submission_notifications.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "submissions/status/"
  }

  depends_on = [aws_sns_topic_policy.submission_notifications]
}
