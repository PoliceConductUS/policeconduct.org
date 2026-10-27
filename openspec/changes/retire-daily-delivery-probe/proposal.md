## Why

The board removed monitoring from scope.

## What Changes

- Delete all scheduled checks and their dedicated infrastructure, configuration, tests, and documentation.
- Retain verified-only staff notifications, their S3 backstop, and receipt metadata.
- Remove the unused receipt-cutoff deployment option.

## Capabilities

### Modified Capabilities

- `submission-notifications`: actual notifications without scheduled monitoring.

## Impact

Manual merge and production deployment gates remain. Preview receipt evidence remains outstanding.
