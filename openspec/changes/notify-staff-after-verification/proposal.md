## Why

Before this change, the forms API told staff about a submission as soon as it was stored, before the submitter confirmed their email address. The board directed in issue INS-89 that staff be told only after the submitter confirms the email address.

## What Changes

- `submitForm` (`POST /forms/submit`) no longer notifies staff when a submission is received.
- `notifySubmissionEvent`, the function that sends every staff notice, does nothing for any event other than `verified`.
- `verifySubmissionLink` calls `notifySubmissionEvent` after it stores the `in_review` status and the used verification record.
- `verifySubmissionLink` stores the `in_review` status before it marks the verification record used, so a failed status write leaves the link usable and a retry still notifies staff (owner decision Q37; task 1.6).
- The submitter's confirmation email is unchanged.
- Out of scope: the confirmation link lifetime, resending confirmation links, and how DSAR (data subject access request) submissions are stored.

## Alternatives Considered

- Notify staff when a submission is received and mark it "not yet confirmed". Rejected: INS-89 says no staff notice before the email address is confirmed.
- Notify on receipt for DSAR forms only. Not chosen; see the DSAR risk below.
- Rely only on the S3 event for the `submissions/status/` object. Rejected as the only path: the forms API notice names the form and submission and stores a notification receipt record. The S3 event stays as a backstop.
- Handle a failed status write by treating a used record with no notification as resumable (needs a new `notifiedAt` field), or by logging an alarmed `forms.verify.notify_incomplete` line. Not chosen: writing the status first (Q37) closes the gap with no new field.

## Risks

- DSAR clock: staff learn of a DSAR only after the submitter confirms the email address, and never if the submitter does not confirm. The owner accepted this (Q36). The staff email still says the INS-16 clock starts when the request is received; for records with a `submissionKey`, the key shows the received date.
- Status write fails: with the status written first (task 1.6), the verification record is not marked used, so the submitter can open the same link again and staff are notified then. If the status write succeeds and marking the record used fails, a retry writes the status again and the S3 status event fires again, so staff can get an extra notice.
- Duplicate notices: each confirmation can reach staff up to three times (the forms API SNS message, the S3 status event on the same topic, and the staff email). This is expected.
- Notification receipt records are stored under `notifications/`, outside `submissions/status/`, so they do not trigger the S3 event.
- Staff notices by SNS were not live in production until the 2026-11-18 applies (tasks 2.1 and 2.2). Task 2.3 records the remaining checks.

## Impact

- Modified: `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs` and `index.test.mjs`.
- Modified: `infrastructure/submission-notifications/DESIGN.md` and `README.md`.
- Merged into `main` in PR #29 (commit `b1e12ad`, 2026-10-25). Tasks 1.5-1.10 are follow-up work not yet done.
- Not part of this change: the `submissions/status/` bucket notification filter (PR #30), and `submissionKey` on verification records, the `forms.notify.*` alarms and the `apply.sh` topic-ARN check (PR #58, by owner decision).
