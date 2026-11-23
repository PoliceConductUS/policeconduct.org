## Why

Before this change, the forms API told staff about a submission as soon as it was stored, before the submitter confirmed their email address. The board directed in issue INS-89 that staff be told only after the submitter confirms the email address.

## What Changes

- `submitForm` (`POST /forms/submit`) no longer notifies staff when a submission is received.
- `notifySubmissionEvent`, the function that sends every staff notice, does nothing for any event other than `verified`.
- `verifySubmissionLink` calls `notifySubmissionEvent` after the confirmation is stored (the `in_review` status and the used verification record).
- Pending (task 1.5): `verifySubmissionLink` will store the `in_review` status before it marks the verification record used. Today it marks the record used first. With the new order, a failed status write leaves the link usable, and opening it again notifies staff. The owner chose this order on 2026-11-19.
- The submitter's confirmation email is unchanged.
- Out of scope: the confirmation link lifetime, resending confirmation links, and how DSAR (data subject access request) submissions are stored.

## Alternatives Considered

- Notify staff when a submission is received and mark it "not yet confirmed". Rejected: INS-89 says no staff notice before the email address is confirmed.
- Notify on receipt for DSAR forms only. Rejected: it reverses INS-89 for DSAR forms. The owner accepted the delay instead on 2026-11-19 (see Risks).
- Rely only on the S3 event for the `submissions/status/` object. Rejected as the only path: the forms API notice names the form and submission and stores a notification receipt record. The S3 event stays as a backstop.
- Treat a used verification record with no notification as resumable on retry. Rejected: it needs a new `notifiedAt` field, and storing the status first gives a working retry with no new field.
- Log an error-level `forms.verify.notify_incomplete` line with an alarm. Rejected: the alarm tells an operator, but staff are still not notified until someone acts by hand.

## Risks

- DSAR clock: staff learn of a DSAR only after the submitter confirms the email address, and never if the submitter does not confirm. The owner accepted this on 2026-11-19. The staff email still says the INS-16 clock starts when the request is received; for records with a `submissionKey`, the key shows the received date.
- Status write fails (after task 1.5): the verification record is not marked used, and the request returns HTTP 500. The verify page shows "Email Confirmation Failed" and does not ask the submitter to try again. Staff are notified only if the submitter opens the same link again before it expires. If not, staff are never told: the error is logged as `forms.request.error` and sent to Sentry, but no alarm reads that line and no `forms.notify.*` line is written. After the link expires, only a resend can recover, and after 3 resends (`MAX_VERIFICATION_RESENDS`) the submission can never notify staff. A verify-page retry message or an alarm on `forms.request.error` would be new behavior for a separate change.
- Used-record write fails (after task 1.5): the status is stored, but the request returns HTTP 500 before the forms API notifies staff. Until a retry, staff get only the S3 status event, which does not name the form and has no DSAR clock text. A retry stores the status again, fires a second S3 event, and sends the forms API notice.
- Duplicate notices: each confirmation reaches staff three times (the forms API SNS message, the S3 status event on the same topic, and the staff email when recipients are set), and more after a retry. This is expected.
- Notification receipt records are stored under `notifications/`, outside `submissions/status/`, so they do not trigger the S3 event.
- Staff notices by SNS were not live in production until the 2026-11-18 applies (tasks 2.1 and 2.2). Tasks 2.3-2.5 deploy task 1.5 and record the remaining checks.

## Impact

- Modified: `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs` and `index.test.mjs`.
- Modified: `infrastructure/submission-notifications/DESIGN.md` and `README.md` (PR #29).
- Modified: `infrastructure/bootstrap-policeconduct/variables.tf` (task 1.8).
- Deploy: the preview and production forms API Lambdas, code only, with `infrastructure/bootstrap-policeconduct/scripts/deploy-forms-api.sh` (task 2.3).
- PR #29 merged into `main` (commit `b1e12ad`, 2026-10-25). Tasks 1.5-1.9, 2.3-2.5 and 3.1-3.3 are open. Tasks 1.5-1.9 go on one branch that is a child of `ddl-openspec`, so they reach `main` with or after PR #58.
- Not part of this change: the `submissions/status/` bucket notification filter (PR #30), and `submissionKey` on verification records, the `forms.notify.*` alarms and the `apply.sh` topic-ARN check (PR #58). The spec also states PR #58's `submissionKey` fallback, because this change archives after PR #58 merges (task 4.1).
- Done in `retire-daily-delivery-probe`, not here: the `submissions/2` comment in `index.mjs`, the "Callers" text in `infrastructure/submission-notifications/EGM.md`, the approval wording in `infrastructure/submission-notifications/README.md`, and the bucket-rule and SNS subscription checks.
