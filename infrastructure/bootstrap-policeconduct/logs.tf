# These existing groups have no tags. Keep adoption separate from changes to
# account tagging, retention, encryption, or the retired canary's log contents.
provider "aws" {
  alias  = "existing_logs"
  region = "us-east-1"
}

resource "aws_cloudwatch_log_group" "existing_lambda" {
  provider = aws.existing_logs
  for_each = toset([
    "/aws/lambda/policeconduct-forms-api-prod",
    "/aws/lambda/policeconduct-forms-api-preview",
    "/aws/lambda/policeconduct-notification-canary",
  ])

  name              = each.value
  retention_in_days = 0
  log_group_class   = "STANDARD"
}

import {
  to = aws_cloudwatch_log_group.existing_lambda["/aws/lambda/policeconduct-forms-api-prod"]
  id = "/aws/lambda/policeconduct-forms-api-prod"
}

import {
  to = aws_cloudwatch_log_group.existing_lambda["/aws/lambda/policeconduct-forms-api-preview"]
  id = "/aws/lambda/policeconduct-forms-api-preview"
}

import {
  to = aws_cloudwatch_log_group.existing_lambda["/aws/lambda/policeconduct-notification-canary"]
  id = "/aws/lambda/policeconduct-notification-canary"
}
