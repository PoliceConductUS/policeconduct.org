## ADDED Requirements

### Requirement: Notification root has no scheduled monitoring

The `infrastructure/submission-notifications` Terraform root SHALL contain no scheduled checks and no resources whose only purpose is monitoring. It SHALL keep the staff notification SNS topic, its topic policy, its email subscriptions, and one S3 notification rule on each submissions bucket, filtered on `submissions/status/`.

#### Scenario: Root is planned from main

- **WHEN** `terraform -chdir=infrastructure/submission-notifications plan` runs from `main`
- **THEN** the configuration and state contain no Lambda function, EventBridge rule, IAM role, alert topic, CloudWatch metric filter, or CloudWatch alarm

#### Scenario: Bucket rules are read

- **WHEN** the bucket notification configuration of each submissions bucket is read
- **THEN** it has exactly one rule, filtered on `submissions/status/`
- **AND** no rule matches initial submission writes
