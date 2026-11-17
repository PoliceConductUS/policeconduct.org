# Dependency exceptions

## Human decision

Approved by the user in the analytics implementation chat on November 10, 2026 (America/Chicago):

> allow this exception - this exception expires in 30 days - after which the dependencies need to be updated or another exception requested - all past and future dependency exceptions expire after 30 days

These approvals apply only to PR #35 and expire December 10, 2026 (America/Chicago), thirty days after approval. After expiry, update the affected dependencies or obtain a new explicit exception. Every past and future dependency exception expires thirty days after its approval; this decision does not silently renew older exceptions.

## Affected checks and reasons

- Root `npm ci` / `npm audit`: eleven moderate dependency alerts arise from `minimatch@10.2.6` through ESLint and TypeScript ESLint. Compatible updates removed four other alerts. The affected tool versions require minimatch 10; the patched minimatch is version 11. The upstream advisory describes excessive CPU/memory from attacker-controlled glob patterns. This installation uses repository-defined lint patterns. A forced major override or the audit tool's suggested breaking downgrades require separate dependency work. See [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- `test:lambda` dependency installation: `@google-cloud/recaptcha-enterprise@7.3.0` requires `google-gax`, which requires `node-fetch@3.3.2`, then `fetch-blob@3.2.0` and deprecated `node-domexception@1.0.0`. The current upstream Google packages retain that chain. Replacing Google's CAPTCHA integration or forcing an unsupported transitive replacement exceeds this scoped fix.

The root production-dependency check, `npm audit --omit=dev --json`, exits zero with zero vulnerabilities. The development-tool alerts and CAPTCHA deprecation remain visible in command output. No audit result, dependency warning, lint assertion, or test is suppressed by these exceptions. Full validation and exact-head CI are still required.
