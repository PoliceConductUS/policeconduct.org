## ADDED Requirements

### Requirement: Staff notifications require email confirmation

The system SHALL notify staff about a form submission only after the submitter confirms the email address. Neither the forms API nor the S3 bucket notification SHALL notify staff when a submission is received.

#### Scenario: A submission is received

- **WHEN** `POST /forms/submit` stores a submission
- **THEN** no staff email is sent
- **AND** no message is published to the submission notifications SNS topic
- **AND** no `forms.notify.*` log line is written
- **AND** no notification receipt record is stored under `notifications/`

#### Scenario: A submission object is stored in the bucket

- **WHEN** an object is written under `submissions/<date>/`
- **THEN** the bucket publishes no event to the submission notifications topic
- **AND** only objects written under `submissions/status/` publish an event

#### Scenario: The submitter confirms the email address

- **WHEN** the `in_review` status and then the used verification record are stored
- **THEN** the forms API publishes one message to the topic when `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` is set
- **AND** it sends one staff email when `SUBMISSION_NOTIFICATION_RECIPIENTS` is set
- **AND** neither message contains submission content; each names the form, the submission ID, the bucket and the submission object key
- **AND** a notification receipt record is stored at `notifications/<date>/<submissionId>-verified.json`
- **AND** the S3 event for the status object also reaches the topic, so staff can receive more than one notice

#### Scenario: The status write fails during confirmation

- **WHEN** storing the `in_review` status fails while the submitter confirms the email address
- **THEN** the verification record is not marked used
- **AND** the submitter can open the same link again
- **AND** when that retry succeeds, staff are notified as in "The submitter confirms the email address"

#### Scenario: No staff notice is delivered

- **WHEN** neither the SNS message nor the staff email is sent
- **THEN** a `forms.notify.nobody_told` line is logged at error level
- **AND** the confirmation still succeeds for the submitter

#### Scenario: An event other than verified is supplied

- **WHEN** `notifySubmissionEvent` receives an event other than `verified`
- **THEN** it sends nothing, logs no `forms.notify.*` line and stores no notification receipt record

#### Scenario: The verification record has no submission key

- **WHEN** the verification record has no `submissionKey`
- **THEN** the staff notice says the key was not recorded and how to find the object
- **AND** the notification receipt record stores `submissionKey` as `null`
