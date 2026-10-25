# Verification

## Result

Scoped implementation and review pass. Final aggregate validation passed all non-browser gates and all eight new tests. Browser result: 87 passed, the same 6 pre-existing failures, 7 skipped (1.7 minutes). No new failures. Full log: /tmp/agency-status-final-validation.log. This is not a baseline-clean release validation.

## Evidence

- Eight focused tests pass: real active/inactive agency pages plus six isolated optional-value/case/date fixtures. The inactive test first failed because the notice was absent.
- Explicit agency.status and agency.status_date::text loading; schema validation requires the columns but permits nulls. Schema validation passed all 32 public tables.
- Astro check: zero errors, zero warnings, three existing hints. Scoped ESLint and Prettier passed.
- Desktop (1440 x 1000) and mobile (390 x 844) inactive pages inspected; active desktop inspected. Status directly follows the agency name, dates remain readable, no horizontal overflow, one main H1. Notice contrast 17.37:1; font size 16px. Mechanical design detector returned no findings.
- Page/OG/Twitter titles and descriptions and GovernmentOrganization/ProfilePage descriptions tested. Calendar dates preserved including 1899-12-31. Canonical URL and organization name preserved. Status date does not become foundingDate, dissolutionDate or dateModified.
- Independent final review: no actionable findings.
- Full production build was not run; production no-inline-CSS configuration remains unchanged. New component CSS uses an Astro style block compiled through the existing external stylesheet configuration.

## Baseline

Before implementation, npm run validate passed format, ESLint, SQL lint, Astro types, shell syntax, schema, OpenSpec and 10 redirect tests. Browser suite: 79 passed, 6 failed, 7 skipped. Four failures expect old civic-index labels/headings; two personnel prefill failures expect older civil-case strings/city casing. Original log: /tmp/agency-status-existing-baseline.log.

## Data observation

Irving's source status_date is 1899-12-31, preserved and reported to user. Anson's ACTIVE/null-date record lacks a projected route, so null-date behavior is tested through isolated fixtures without changing shared data.

## References

Schema.org GovernmentOrganization supports description: https://schema.org/GovernmentOrganization and https://schema.org/description. No unsupported status-specific schema property added.
