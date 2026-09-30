# Verification

- Shared router and loader review passed after documenting staged initial activation.
- `npm run test:redirects`: 65 passed, including production/preview runtime parity, loader AWS mocks, generator artifact eligibility, and existing coverage tests.
- `terraform -chdir=infrastructure/bootstrap-policeconduct validate -no-color`: passed.
- `npm run validate`: formatting, ESLint, SQL lint, Astro types (0 errors/warnings), shell syntax, schema (26 tables), OpenSpec (16 items), 65 redirect tests and 10 forms API tests passed. Browser suite: 74 passed, 32 failed, 1 skipped, 34 did not run. Current local data differs from the preserved deployed build; no database changes or assertion weakening were made. Evidence: /tmp/pc-shared-redirects-validate.log.
- Preserved preview map: 6,271 original entries; remove 52 category entries with absent destination HTML and five identical duplicates; 6,214 unique mappings remain, all destinations exist in preserved dist. Current database regeneration produced a different map and was not deployed.
- Full prior-sitemap coverage remains unresolved independently of router activation: the pre-correction audit found 427 uncovered prior URLs and five existing checker false positives for noindex pages. No blanket absence declarations or invented redirects.
- AWS DEVELOPMENT execution initially rejected `for...of`; the router now uses indexed loops. All six actual edge tests passed (compute utilization 8–11): exact, wildcard, repeated queries, normal page, asset, and absent mapping. Evidence: /tmp/pc-shared-router-aws-tests.json.
- Preview store populated with 6,214 keys before publication. Store ARN: arn:aws:cloudfront::942370948729:key-value-store/1063f7e5-e1c7-48c4-b4a1-d47c421e4441. Imported into the existing bootstrap Terraform state without altering prior resources or outputs; local KVS_ARN_PREVIEW configured.
- Preview router published LIVE; matching map uploaded to pr-3/\_redirect-map.json. Invalidation: I7ANRUDL5NF79N03CJ7575211M.
- Live verification: 18 sampled legacy redirects all return 301 to same-preview-host targets returning 200, preserving repeated and encoded query values; homepage, Texas root, and favicon return 200. Evidence: /tmp/pc-preview-redirect-live.json.
- Production LIVE function ETag/configuration checked unchanged after preview publication.
- Production activation: explicitly deferred by user.
