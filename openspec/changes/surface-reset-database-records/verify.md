# Verification

## Current evidence

On 2026-09-30, a fresh read-only census found 29 public tables, 3,300 agencies, 140,552 personnel, and 320 arrest profiles. Every agency references a place. Metropolitan Airports Commission resolves to `/mn/hennepin-county/fort-snelling-ut/`. No personnel lack assignments, and no assignment license belongs to another person.

All 3,300 agencies now have projections; the derived inventory includes 1,693 locations, three report summaries, and 4,996 payloads. The coverage audit identifies each table's visitor use and explicit exceptions.

Focused tests: 19 passed, zero skipped. Red/green regressions reproduce and correct the report UTC calendar-date shift and mobile arrest-table clipping. The tests compare every stored breakdown entry for the sampled profile and assert exact assignment-license relationships, absent-data omission, report facts and privacy, case facts, and formerly excluded agency navigation.

Schema validation passes for 26 required public tables, including the nullable `civil_cases.date_terminated` column. Astro checks report zero errors, zero warnings, and three existing hints. Repository formatting passes, including SQL formatting. Scoped lint and whitespace checks pass.

Independent task reviews and final integration review found no unresolved blocking issues. The schema-contract omission found in final review was corrected and re-reviewed. Impeccable detection reports no findings. The first desktop/mobile visual batch identified the two corrected issues; final confirmation against built output passed for six routes at desktop and mobile sizes (12 checks), with no horizontal overflow. All screenshots were visually inspected.

## Release gates

Aggregate validation after the source-shape fix passes: 138 browser tests passed, one built-search test skipped on the dev server; all 10 redirect and 10 forms API tests passed. Formatting, lint, types, shell syntax, schema, and 14 OpenSpec validations passed. Three initial prefill failures were stale expected names missing the recorded suffix V; exact expectations were updated without weakening assertions.

The full build of `ad4f4edb88b6745116e839e68af7b69f37c2f24c` passed, including CSS checks, 6,271 redirects, sitemap generation and Pagefind indexing of 165,464 searchable pages. All 165,466 generated HTML files passed the no-inline-CSS check. Built-output search tests passed (two tests, zero skips). Both source commits are pushed to the existing PR branch. Preview upload completed successfully on 2026-09-30 at 12:16 UTC. Published HTML/assets pass verification; live search remains blocked by the deployed shared CSP, as detailed below. No production deployment is part of this change.

## Full-build shape finding

The first full build of source commit `21047d8` stopped after 14,807 rendered routes because the component assumed every arrest profile had all seven dimensions. A fresh audit of all 320 JSON objects found 275 with seven dimensions and 45 omitting one or more categorical dimensions. All present maps contain valid counts and reconcile to their recorded profile total. The build failure is a rendering assumption, not permission to fabricate missing source values. The scoped fix models the three categorical maps as optional and omits only absent keys. A regression renders all 320 live profiles and compares every stored table, label, count, and share exactly; it passes, as do preserved missing-required and present-null failure checks. All eight personnel tests pass. Independent scoped review approved the fix. This partial output was not published.

## Generated-output parity

Static generation produced 165,466 pages. The exhaustive check of every personnel page passed with zero mismatches: 140,552 people, 1,769,990 education records, 163,805 licenses, 188,003 license actions, 76 discipline records, 320 arrest profiles, and 181,686 assignment-license links. All 3,300 agency pages, 465 case pages, and three report pages exist at canonical paths. All 51,636 stored arrest-breakdown rows are present on the correct profiles. The entire-profile focused regression independently compares source labels, counts, and shares. Build postprocessing passed. Published HTML/assets pass verification. The live search result and shared-policy approval boundary are recorded below.

## Published preview

The complete artifact from source commit `ad4f4edb88b6745116e839e68af7b69f37c2f24c` is published at https://pr-3.preview.policeconduct.org/. `PR_NUMBER=3 npm run deploy:preview:sync` completed with exit 0. CloudFront invalidation `I2F4GQ8BW8YQ2G3ZL2DK45BL43` for `/pr-3/*` is Completed. The local artifact contains 332,113 files totaling 6,888,909,064 bytes.

Live verification compared nine canonical HTML pages and 14 referenced assets byte-for-byte with the local artifact: all matched, all returned HTTP 200, and JavaScript/CSS MIME types were correct. The samples cover root, Texas, Minnesota, personnel arrest records, an agency without linked records, a report, a civil case, Metropolitan Airports Commission, and a profile with omitted categorical arrest maps. Preview robots.txt matches the deny-all build artifact.

## Remaining live search gate

The unmodified live browser search test fails: CloudFront's deployed Content Security Policy blocks Pagefind's WebAssembly. Its required JavaScript, worker, metadata, and WASM files return HTTP 200. The repository already includes `'wasm-unsafe-eval'` in `infrastructure/bootstrap-policeconduct/main.tf`, but deployed response-headers policy `ea0a9aa3-1f0e-4bb7-a9f4-addd13a5d0ab` lacks that token.

The policy is shared by preview distribution `EXPW875KV1ZH5` and production distribution `E2J0V67TGXH1PG`. A browser-only response-header substitution adding exactly that token made the live search test pass and navigate to the expected Irving Police Department page. This diagnostic did not change AWS and is not counted as a passing unmodified live test. Approval is pending because applying the fix would also change production headers beyond the preview-only release scope. The exact proposed policy configuration is prepared; all other policy settings are preserved.

GitHub checks are not all green. The automated preview job fails before deployment because `aws-region` is missing; publication used working local credentials. The two CodeQL analysis jobs pass, while the aggregate CodeQL and Copilot setup checks remain failed. These CI failures are separate from the successful local aggregate validation and completed full build.

The new change remains active until the live search gate is resolved or its limitation is explicitly accepted. The completed schema-consumer change is archived. No production content or security policy was changed.
