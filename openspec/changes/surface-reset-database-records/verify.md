# Verification

## Current evidence

On 2026-09-30, a fresh read-only census found 29 public tables, 3,300 agencies, 140,552 personnel, and 320 arrest profiles. Every agency references a place. Metropolitan Airports Commission resolves to `/mn/hennepin-county/fort-snelling-ut/`. No personnel lack assignments, and no assignment license belongs to another person.

All 3,300 agencies now have projections; the derived inventory includes 1,693 locations, three report summaries, and 4,996 payloads. The coverage audit identifies each table's visitor use and explicit exceptions.

Focused tests: 19 passed, zero skipped. Red/green regressions reproduce and correct the report UTC calendar-date shift and mobile arrest-table clipping. The tests compare every stored breakdown entry for the sampled profile and assert exact assignment-license relationships, absent-data omission, report facts and privacy, case facts, and formerly excluded agency navigation.

Schema validation passes for 26 required public tables, including the nullable `civil_cases.date_terminated` column. Astro checks report zero errors, zero warnings, and three existing hints. Repository formatting passes, including SQL formatting. Scoped lint and whitespace checks pass.

Independent task reviews and final integration review found no unresolved blocking issues. The schema-contract omission found in final review was corrected and re-reviewed. Impeccable detection reports no findings. The first desktop/mobile visual batch identified the two corrected issues; final confirmation against built output remains pending.

## Release gates

Aggregate validation passes: 136 browser tests passed, one built-search test skipped on the dev server; all 10 redirect and 10 forms API tests passed. Formatting, lint, types, shell syntax, schema, and 14 OpenSpec validations passed. Three initial prefill failures were stale expected names missing the recorded suffix V; exact expectations were updated without weakening assertions.

Full build, exhaustive generated-record checks, final visual confirmation, commit/sync, and remote preview verification are pending. This document will be updated with their actual results before the release is reported complete. No production deployment is part of this change.
