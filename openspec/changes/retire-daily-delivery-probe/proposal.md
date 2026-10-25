## Why

The board retired daily delivery verification and requested deletion of its code.

## What Changes

- Delete synthetic sending, status polling, delivery-only tests and configuration.
- Delete the delivery alarm and stop publishing its metric.
- Preserve shared scheduling and verified intake notifications.
- Remove initial-write S3 filters and reconcile only verified requests, matching the approved verified-only acceptance behavior.

## Capabilities

### Modified Capabilities

- `submission-notifications`: remove scheduled synthetic delivery verification.

## Impact

Only the submission-notifications stack changes. Merge and production deployment require human approval. Preview acceptance follows verified-only staff notifications.
