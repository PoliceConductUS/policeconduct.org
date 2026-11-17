# Verification

Complete `npm run validate` passes on Node 24.21.0: 295 Node tests and 162 browser tests, zero failures and zero skipped tests. Formatting, lint, type checks, shell/schema checks, all 33 OpenSpec items and the personal-data scan pass without warnings or type hints. Locked root installation and root/Lambda dependency audits are clean.

The combined branch includes complaint/redirect parent commit `815aaa6fdb7d329a5473b4c3a473f57547ddb9ea` and the annotation parent. Verification uses a disposable retained-source corpus replayed through intake at checkpoint `000031`; protected complaint, review and civil-case content hashes are unchanged. No original corpus or public site is changed.

Regression coverage checks uncertain chronology in SQL, rosters, profiles, structured data and follow-up form payloads; UTC calendar-date rendering; and visible/structured report titles. The rendered uncertain-record test selects a source-backed reversed-date assignment with one grouped query. It preserves the original predicate and assertions while avoiding a correlated scan that timed out before rendering.

The final pushed commit, current CI results and reproducible loopback commands are recorded in the coordinated INS-117 integration manifest. Default-branch merge, deployment and personnel publication remain separately gated.
