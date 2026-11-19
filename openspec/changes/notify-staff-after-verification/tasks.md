## 1. Implementation

- [x] 1.1 Add failing tests that show staff notices sent before verification (`index.test.mjs`, PR #29).
- [x] 1.2 Remove the received-event staff notice and gate `notifySubmissionEvent` to `verified` (PR #29, `b1e12ad`).
- [x] 1.3 The forms API Lambda unit suite passes (see verify.md).
- [x] 1.4 Merge into `main` (PR #29, 2026-10-25).
- [ ] 1.5 Full `npm run validate`, including browser tests, passes on the final head of the branch that archives this change. Record the evidence in verify.md.
- [ ] 1.6 Write the status before marking the link used (owner decision Q37). In `verifySubmissionLink` in `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`, call `saveSubmissionStatus(record.submissionId, "in_review", verificationId)` before `writeJsonObject(...)` stores the record with `usedAt`. Add a test in `index.test.mjs` that makes the `submissions/status/` write fail once, then opens the same link again. Pass: the first request fails and the stored verification record has no `usedAt`; the second request returns success, stores `usedAt`, writes the `in_review` status, and sends exactly one staff notice (one SNS publish when `SUBMISSION_NOTIFICATIONS_TOPIC_ARN` is set, one staff email when `SUBMISSION_NOTIFICATION_RECIPIENTS` is set) and one notification receipt record under `notifications/`. Existing verification tests still pass.
- [ ] 1.7 Add the test "submitting a form does not notify staff before confirmation" to the PR #29 suppression block in `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs` (near the `received`/`unexpected` loop). It sets `RESEND_API_KEY`, `SUBMISSION_NOTIFICATION_RECIPIENTS` and a test `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`, counts `SNSClient.prototype.send` calls, and sends `POST /forms/submit` through `handler` using `withVerificationStore`. Pass: exactly one email is sent (the submitter's confirmation email), zero SNS calls, no store key starts with `notifications/`, and no `forms.notify.` log line is written.
- [ ] 1.8 Fix the stale comment at `index.mjs` "Tell a human that a submission arrived" (near `notifySubmissionEvent`'s staff-email helper): say staff are told after the submitter confirms the email address, and that the S3 event fires for `submissions/status/` writes. Pass: no comment in `index.mjs` says staff are told when a submission arrives.
- [ ] 1.9 Fix the stale comment in `index.mjs` that says the bucket filter covers `submissions/2` and `submissions/status/`: say the filter is `submissions/status/` only. Fix `infrastructure/bootstrap-policeconduct/variables.tf` text "arrives or is verified" to say "is confirmed". Pass: both texts match `infrastructure/submission-notifications/main.tf`.
- [ ] 1.10 In `infrastructure/submission-notifications/EGM.md`, replace the text that says the topic ARN is "passed by the operator" with: `scripts/apply.sh` reads the `submission_notifications_topic_arn` output. Pass: the text matches `infrastructure/bootstrap-policeconduct/scripts/apply.sh`.

## 2. Production (run from `main`)

- [x] 2.1 Apply `infrastructure/submission-notifications` (applied 2026-11-18).
- [x] 2.2 Run `infrastructure/bootstrap-policeconduct/scripts/apply.sh` (applied 2026-11-18; both forms Lambdas now have `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`).
- [ ] 2.3 Run the remaining checks in `infrastructure/submission-notifications/README.md` "Verify": both buckets notify only on `submissions/status/`, and one synthetic preview submission sends no staff notice before verification and one after. Record the evidence in verify.md, with the topic ARN check from 2.2.
- [ ] 2.4 After task 1.6 merges, deploy the forms Lambdas with `infrastructure/bootstrap-policeconduct/scripts/apply.sh` from `main`. Pass: the deployed `verifySubmissionLink` writes the status before marking the link used.

## 3. Archive

- [ ] 3.1 Run `/opsx:archive notify-staff-after-verification` after PR #58 merges and tasks 1.5-1.10, 2.3 and 2.4 are done.
