output "submission_notifications_topic_arn" {
  description = "Feed this into the bootstrap stack's submission_notifications_topic_arn variable, and into the forms-api Lambda environment."
  value       = aws_sns_topic.submission_notifications.arn
}

output "canary_alert_topic_arn" {
  description = "Topic for notification-path failure alerts. Deliberately not the submissions topic: an alert about a dead channel must not fan out to that channel."
  value       = aws_sns_topic.canary_alerts.arn
}

output "canary_function_name" {
  description = "Invoke this directly to run key reconciliation on demand rather than waiting for the schedule."
  value       = aws_lambda_function.canary.function_name
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
    "aws sns list-subscriptions-by-topic --topic-arn ${aws_sns_topic.canary_alerts.arn} --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output table",
    "",
    "# 2. Both rules must be present. An empty result is the INS-20 state.",
    "aws s3api get-bucket-notification-configuration --bucket ${data.aws_s3_bucket.submissions.id}",
    "",
    "# 3. Run key reconciliation. Review failures and missingNotificationCount; this does not prove mailbox receipt.",
    "aws lambda invoke --function-name ${aws_lambda_function.canary.function_name} --payload '{}' /dev/stdout",
  ])
}
