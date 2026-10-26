output "submission_notifications_topic_arn" {
  description = "Feed this into the bootstrap stack's submission_notifications_topic_arn variable, and into the forms-api Lambda environment."
  value       = aws_sns_topic.submission_notifications.arn
}

output "verify_commands" {
  description = <<-EOT
    Post-apply checks. A correct-looking plan is not evidence that anybody is
    being told — INS-16 exists because a 200 and an id were read as proof of an
    outcome they did not prove.
  EOT
  value = join("\n", [
    "# 1. Every recipient must read Confirmed. PendingConfirmation means that person has not clicked, and is therefore being told nothing.",
    "aws sns list-subscriptions-by-topic --topic-arn ${aws_sns_topic.submission_notifications.arn} --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output table",
    "",
    "# 2. Only the verification-status rule must be present; initial writes must not alert staff.",
    "aws s3api get-bucket-notification-configuration --bucket ${data.aws_s3_bucket.submissions.id}",
    "",
  ])
}
