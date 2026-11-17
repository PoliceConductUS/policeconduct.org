## Why

The board directed on INS-89 that staff be notified only after a submission is verified. Receipt currently sends email and SNS notifications before verification.

## What Changes

- Remove staff notification on receipt.
- Restrict the notification coordinator to verified events.
- Preserve verification emails to submitters and verified-event notifications.
- Preserve existing storage and DSAR review records. No TTL extension, resend feature, fetcher, deployment, or change to legal handling is authorized by this patch.

## Impact

Forms API Lambda and its unit tests. Stacked on ins89/selective-revert, which restores the board-approved 15-minute window while preserving recovery and send metadata. Only the board user may manually merge into main.
