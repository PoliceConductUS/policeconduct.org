# Approved analytics outcome

Visitors can use verification links and search without sending private tokens or search text to Google. Production reporting excludes local and preview activity. Header, search, donation and submission measurements describe the action that actually happened. Existing annotation behavior is preserved.

The user approved all findings from the analytics audit and requested implementation, commit, and GitHub synchronization on the existing annotations branch. The earlier annotation design remains authoritative for annotation work. No new branch, worktree, dependency, payment-completion integration, public copy, or publication is required.

Small scoped implementation decisions: use shared analytics initialization and URL sanitization, count completed search responses and result selections without raw queries, keep receipt and verification-email outcomes separate, use fourteen-month event retention, and validate traffic-exclusion rules before enabling them. These implement the approved audit findings without changing source data or form acceptance semantics.

## Approved configuration management

The user requested a versioned Analytics configuration and npm commands to compare and apply its settings. Keep the existing Google property and web stream. Manage the approved key events, event creation rules, eight reporting dimensions, retention, enhanced measurement, and URL redaction through Google's Admin API. A read-only comparison shows differences; an explicit apply updates the listed settings. Keep credentials outside this public repository and preserve unrelated Google settings. Internal-traffic rules remain manual because the documented API does not expose them. The user explicitly chose to keep production visits from the team included; no internal IP rules are needed.

Use the existing Node runtime and built-in HTTP support without a new dependency. Read a Google Analytics access token from the environment rather than changing an existing Cloud login. This is a manual administration tool; website builds and automated tests do not call Google.
