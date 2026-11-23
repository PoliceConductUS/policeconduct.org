## 1. Implementation

Tasks 1.5-1.9 go on one new branch, a child of `ddl-openspec` (the leaf of the branch stack; AGENTS.md "Workflow Standards"). That branch reaches `main` with or after PR #58.

- [x] 1.1 Add failing tests that show staff notices sent before verification (`index.test.mjs`, PR #29).
- [x] 1.2 Remove the received-event staff notice and gate `notifySubmissionEvent` to `verified` (PR #29, `b1e12ad`).
- [x] 1.3 The forms API Lambda unit suite passes (see verify.md).
- [x] 1.4 Merge into `main` (PR #29, 2026-10-25).
- [ ] 1.5 Store the status before marking the link used (owner decision, 2026-11-19). In `verifySubmissionLink` in `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`, call `saveSubmissionStatus(record.submissionId, "in_review", verificationId)` before the `writeJsonObject(...)` call that stores the record with `usedAt`. Add two tests to `index.test.mjs`. Each test:
  - sets `RESEND_API_KEY`, `SUBMISSION_NOTIFICATION_RECIPIENTS` (one test address), a test `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` (not `undefined`, unlike the test "the staff notification and receipt point at the submission object, not the status object"), `SUBMISSIONS_BUCKET` and `SUBMISSIONS_KMS_KEY_ID` (without the last two, `saveSubmissionStatus` returns without writing);
  - stubs `SNSClient.prototype.send` with a call counter;
  - inside `withVerificationStore`, wraps `S3Client.prototype.send` so that one chosen `PutObjectCommand` throws once;
  - sends the same confirmation link to `handler` twice.

  Test "status write fails": the first `PutObjectCommand` whose key starts with `submissions/status/` throws. Pass: the first response is HTTP 500 and the stored verification record has no `usedAt`; the second response is HTTP 200 (not `already_used`), the record has `usedAt`, the `in_review` status is stored, and across both requests there is exactly one SNS publish, exactly one staff email and exactly one key under `notifications/`.

  Test "used-record write fails": the first `PutObjectCommand` whose key starts with `submissions/verify/` throws. Pass: the first response is HTTP 500, the `in_review` status is stored, and no SNS publish, staff email or `notifications/` key exists yet; the second response is HTTP 200, the record has `usedAt`, and across both requests there is exactly one SNS publish, exactly one staff email and exactly one key under `notifications/`.

  Existing verification tests still pass.

- [ ] 1.6 Add the test "submitting a form does not notify staff before confirmation" to `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs`, after the `RECAPTCHA_TEST_CONFIG` and `mockValidRecaptcha` declarations. Copy the setup of the test "the staff notification and receipt point at the submission object, not the status object": `setEnv` with `RECAPTCHA_TEST_CONFIG`, `RESEND_API_KEY` and `SUBMISSION_NOTIFICATION_RECIPIENTS`; `mockValidRecaptcha(t)`; `withVerificationStore`; a `POST /forms/submit` body with `formName`, `releaseId` and `recaptchaToken`. Unlike that test, set a test `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`, stub `SNSClient.prototype.send` with a call counter, and capture `console.error`, `console.warn` and `console.info`. Pass: the response is HTTP 200, exactly one email is sent (the submitter's confirmation email), there are zero SNS calls, no store key starts with `notifications/`, and no captured line contains `forms.notify.`.
- [ ] 1.7 In `index.mjs`, fix two stale comments. The doc comment on `publishSubmissionNotification` ("Tell a human that a submission arrived"): say staff are told after the submitter confirms the email address, and that the S3 event fires for `submissions/status/` writes. The comment in `sendSubmissionNotificationEmail` ("a submission landed and there is nobody to tell"): say a submission was confirmed and there is nobody to tell. Pass: no comment in `index.mjs` says staff are told when a submission arrives or lands.
- [ ] 1.8 In `infrastructure/bootstrap-policeconduct/variables.tf`, change "arrives or is verified" in the recipients description to "is confirmed". Pass: the description matches `infrastructure/submission-notifications/main.tf` (staff are told only on `submissions/status/` writes).
- [ ] 1.9 After 1.5-1.8, full `npm run validate`, including browser tests, passes on the final head of that branch. Record the evidence in verify.md, including the names and results of the tests from 1.5 and 1.6.

## 2. Production (run from `main`)

- [x] 2.1 Apply `infrastructure/submission-notifications` (the owner applied it 2026-11-18; see verify.md).
- [x] 2.2 Run `infrastructure/bootstrap-policeconduct/scripts/apply.sh` (the owner applied it 2026-11-18). Task 2.4 checks the topic ARN on both forms Lambdas.
- [ ] 2.3 After the task 1.5 branch merges into `main`, deploy the forms API code from `main` with `infrastructure/bootstrap-policeconduct/scripts/deploy-forms-api.sh --topic-arn <the submission_notifications_topic_arn output of infrastructure/submission-notifications> --recipients <the current recipients> --apply`, first with `--only policeconduct-forms-api-preview`, then for production. The script deploys code only and stops if the live topic ARN or recipients differ, so it cannot clear the topic ARN. Pass: for both functions, the sha256 of the deployed `index.mjs` (the script's "Verify" commands) equals the `index.mjs sha256` the script printed. Record the `main` commit and both hashes in verify.md. (Lambda `CodeSha256` is not comparable across builds.)
- [ ] 2.4 Topic ARN check. For both forms Lambdas, `aws lambda get-function-configuration --query Environment.Variables.SUBMISSION_NOTIFICATIONS_TOPIC_ARN` equals the `submission_notifications_topic_arn` output of `infrastructure/submission-notifications`. Record the output and both values in verify.md.
- [ ] 2.5 After 2.3, one person submits one clearly synthetic request through the preview form (`infrastructure/submission-notifications/README.md` "Verify"). Pass, recorded in verify.md with no request content: before confirmation, no staff email, no SNS message and no `notifications/` record; after confirmation, one forms API SNS message, one S3 status event message, one staff email, and one `notifications/<date>/<submissionId>-verified.json` record. The SNS subscription and bucket-rule checks are done in `retire-daily-delivery-probe` (its `verify_commands` task).

## 3. Shared work in `retire-daily-delivery-probe`

These edit `openspec/changes/retire-daily-delivery-probe/tasks.md`, so each shared item has one owner.

- [ ] 3.1 In its `index.mjs:1017-1019` comment task, replace "and that a receipt written under `submissions/` could match a notification rule and fire a notification about a notification." with "and that a receipt written under `submissions/status/` would fire a notification about a notification, which is one reason receipts are stored under `notifications/`." Pass: that task contains the new sentence and not the old one.
- [ ] 3.2 In its `infrastructure/submission-notifications/EGM.md` "Callers" task, replace "`scripts/apply.sh` reads it" with "`infrastructure/bootstrap-policeconduct/scripts/apply.sh` reads it", and append: "Pass: no line in EGM.md says the topic ARN is passed by the operator or that `scripts/terraform-outputs.mjs` does not read this root's outputs." Pass: that task names the full path and has the pass line.
- [ ] 3.3 Replace its synthetic preview task with: "If the forms API deploy task above deployed new code, run the synthetic preview check of `notify-staff-after-verification` task 2.5 again and record the same fields in verify.md. Otherwise cite that change's verify.md." Pass: `retire-daily-delivery-probe/tasks.md` has no second, separately worded synthetic preview check.

## 4. Archive

- [ ] 4.1 Run `/opsx:archive notify-staff-after-verification` after PR #58 merges and tasks 1.5-1.9, 2.3-2.5 and 3.1-3.3 are done.
