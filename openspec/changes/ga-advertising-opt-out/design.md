## Decision

Use advanced consent mode as explicitly requested. Read only a valid saved choice;
otherwise default analytics_storage to denied before loading Google. Both legacy
advertising flags remain false and all three advertising permissions stay denied.
Store the choice per origin; storage failure defaults the next visit to denied.
Withdrawal sends a consent update and removes first-party GA cookies. Sync changes
across tabs. The in-flow panel has equally styled Allow/Decline buttons and a
persistent Privacy settings button; it states that cookieless measurement continues.

## Verification

Test fresh, accepted, declined, returning, withdrawn, invalid-storage, storage-error
and cross-tab behavior. Intercept Google requests when testing synthetic content.
A mocked tag verifies our integration, not actual Google cookie/network behavior;
deployed network verification remains required after an authorized release.

## Source

https://developers.google.com/tag-platform/security/guides/consent
https://developers.google.com/tag-platform/security/concepts/consent-mode
Retrieved 2026-11-14. These describe technical behavior, not legal approval.
