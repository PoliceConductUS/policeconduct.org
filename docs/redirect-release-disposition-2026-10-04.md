# Release URL decisions — October 4, 2026

The original 477 count measures URLs, not 477 missing entities or independent decisions. This inventory accounts for every original URL exactly once. Recommendations below are proposals, not applied absence records or permission to remove published records.

- One URL (`/verify/`) is already built and is resolved by the checker fix. Four other false positives concern redirect destinations and were outside the 477.
- Eleven approved duplicate agency URLs have retained destinations: four Minnesota agencies, three Texas agencies, and FBI/ATF/DEA/Secret Service. Their redirects are the authorized implementation scope.
- After the checker correction, 15 verified agency redirects, and two explicitly approved report absences, 459 URLs remain: 298 state/category/pagination URLs, 54 excluded agency entries, and 107 record/media URLs needing further source or identity review.
- Those 107 are 57 cases, 29 agency URLs (28 agency names, including two Antioch IDs), 19 personnel, and two watch routes. They should not be treated as 107 proven missing real-world entities.

## October 9 empty-state decision

The user approved excluding empty state pages. A fresh production sitemap and
current database comparison identified 235 published URLs across 47 states with
no agencies having current personnel assignments, reports, or civil cases. Their
exact state roots and empty legacy state collection URLs are now recorded in
`route-absences.json`. This does not exclude federal root pages or authorize
removing individual agency, personnel, case, report, or watch records. Earlier
counts below remain historical inventories, not the current release result.

Separately, the existing approved current-assignment rule accounts for 139
published agency URLs whose exact database slugs identify agencies with zero
current assignments. Their absence entries record that the agency has no current assignment.
Approved duplicate-agency redirect sources are excluded from this accounting.
Personnel profiles and federal root pages remain outside this exclusion.

## October 5 intake rerun

Applied CourtListener chain entry 000009 to the local database: 105 case creates, 305 personnel-link creates, and 105 source-link creates. Database case count increased from 465 to 570. The transform emits 551 cases; the additive update retains existing cases it no longer emits. No deletions were generated.

Eldreth and Savell are now restored with their original published IDs and slugs. Eldreth links to Blake M. Bullin and Christian C. Flores at Houston PD and the previously disclosed Claudia Flores match at Houston Emergency Center; Savell links to Bryan T. Pham at Galveston PD. Clark remains unresolved. The two report exclusions are unchanged.

All applied chain entries verify, a second generation is an empty diff, and website projections were refreshed. The preserved build/map has not been regenerated: its earlier 459 unresolved count remains historical build evidence, not a fresh count of current database coverage. No production build or deployment was performed.

## Source-trace corrections

The user explicitly declined restoring the Renee Nicole Good and Alex Pretti reports; exact absence records are now in `route-absences.json`.

The four remaining federal aliases now resolve to existing headquarters Agency records with the same IDs and slugs as the production SQL reference. No federal data additions, merges, or identity guesses were needed. CBP: `/dc/district-of-columbia/washington/u-s-customs-and-border-protection-cbp-cbba91/`; TSA: `/va/fairfax-county/springfield/transportation-security-administration-tsa-4e6cff/`; Coast Guard: `/dc/district-of-columbia/washington/u-s-coast-guard-uscg-e07f77/`; U.S. Marshals: `/va/arlington-county/arlington/u-s-marshals-service-e7cfd1/`. Full trace: `/tmp/pc-federal-current-trace.md`.

The nested watch routes were deleted in `c0d17dd` on May 22, 2026. The located design forbids a top-level video section; explicit approval to remove nested watch pages has not been established. The user expects those pages to remain. Both legacy watch pages still serve on production and embed YouTube video `TKh6X74AEc0`. The current report links to that video under a different link ID; the current case has only a CourtListener link. Restore watch behavior and resolve backing-link identity/relationship loss through intake; do not replace the watch page with a redirect to an ordinary parent page. Full diagnostic: `/tmp/pc-watch-route-findings-20261004.md`.

## Seven-case trace before the October 5 import

Follow-up: the shared intake whitespace, `office` substring, and Officer/Chief title-scoring bugs are now fixed locally. Read-only replay matches Savell to Bryan T Pham. The subsequent user-authorized initials update also matches Eldreth to Houston PD personnel Blake M. Bullin and Christian C. Flores; it additionally matches Claudia Flores in the separately acquired Houston Emergency Center scope, whose roster lacks a middle name. Clark remains unresolved: its acquired name is Chief Mike Gudgel, and the Denison roster contains Michael A. Gudgel, but Clark is absent from Denison acquisition results and nickname handling is unchanged. No records have been imported. Current verification and zero-docket provenance: `../intake/openspec/changes/fix-civil-party-name-resolution/verify.md` (relative to the repository roots). The table below records the original pre-fix trace.

The retained `dev-copy` September 28 acquisition contains six exact dockets. Its latest September 30 CivilCases artifact contains 465 cases and none of these six. All seven requested cases were absent from the database at the time of this trace. The configured `dev` workspace has no CourtListener acquired files; it must not be confused with the retained acquisition in `dev-copy`.

Read-only replay at this stage against the actual personnel resolver established the exclusion gate: every acquired case passes title/date validation, but resolves zero personnel, so `sources/courtlistener/transform.ts:100` skips it before import.

| Case     | Exact docket acquired in dev-copy? | Current exclusion evidence                                                                                                                                                                                                              |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barrera  | Yes                                | No accepted roster matches for Maribel Barrera or Alvin Rovinzon.                                                                                                                                                                       |
| Clark    | Yes                                | `Chief  Mike Gudgel` fails the name regex because of doubled spaces; all remaining candidates fail personnel resolution.                                                                                                                |
| Eldreth  | Yes                                | The institution filter's unanchored `office` expression rejects `Officer` names, including Bullin and Flores; remaining candidates fail resolution.                                                                                     |
| Ellis    | Yes                                | No accepted roster matches for Lauren Gilmette or Eric Ellis.                                                                                                                                                                           |
| Guymon   | Yes                                | All three candidate names have zero roster candidates.                                                                                                                                                                                  |
| Savell   | Yes                                | The same `office` filter rejects `Officer  Bryan Pham` before resolution, although Galveston's roster contains Bryan T Pham; the remaining candidate fails resolution.                                                                  |
| Van Kirk | No                                 | Requested 4:26-cv-02517 is absent in both inspected acquisition runs. Same title appears as CourtListener 73112445 / 4:26-cv-00000; title equality does not prove identical case identity. That alternate also resolves zero personnel. |

These were verified transform results at that stage, not a reconstruction of the historical roster on September 30. The trace itself did not change intake data or resolver code; subsequent fixes and imports are recorded above. Detailed source paths, canonical IO, every agency occurrence, and reproduction limits: `/tmp/pc-seven-cases-current-trace.md`; machine-readable resolver evidence: `/tmp/pc-seven-resolver-trace.json`.

## Decision groups

| Group                                              | URLs | Recommended next action                                                                                                               |
| -------------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Built noindex page                                 |    1 | Checker fix; no URL decision.                                                                                                         |
| Approved duplicate redirects                       |   11 | Add direct redirect (authorized).                                                                                                     |
| State/category pages without a built state page    |  230 | Recommend exact absence records for this release; revisit when records populate that state.                                           |
| Collection and pagination routing                  |   68 | Recommend redirect to the corresponding state/federal index; TX pagination goes to /tx/.                                              |
| Already excluded agency placeholders               |   54 | Recommend exact absence records; do not restore excluded records.                                                                     |
| Cases outside selected input                       |   50 | Recommend intake investigation/restoration with original ID and slug; no substitute case redirect.                                    |
| Cases previously classified as acquired            |    7 | Recommend intake investigation/restoration with original ID and slug; no substitute case redirect.                                    |
| Legacy agencies absent from intake                 |   29 | Review import eligibility and identity; restore valid records through intake, preserving identity.                                    |
| Personnel assigned only to excluded agency entries |   15 | Decide whether to retain personnel independently of excluded assignments; investigate intake before declaring absent.                 |
| Four personnel identity decisions                  |    4 | Verify source identity against current candidates; merge/redirect only after confirmation.                                            |
| Two omitted reports                                |    2 | Do not restore: user declined restoration on October 4; exact absence records added.                                                  |
| Verified federal headquarters redirects            |    4 | Redirect to the current headquarters record with the exact preserved production ID and slug; implemented.                             |
| Watch subroutes                                    |    2 | Preserve nested watch functionality. Removal approval is not established; do not substitute a redirect to the ordinary parent record. |

## What can be decided together

1. **State navigation:** 230 URLs represent five old navigation forms for 46 states with no generated state root. Recommend recording these exact URLs as absent for this release. No generic homepage redirects.
2. **Existing indexes:** 68 URLs can be handled as one routing decision: 58 Texas agency pagination URLs, six agency indexes (DC, federal, IL, MN, TX, VA), one federal case index, and three report indexes (DC, IL, VA). Recommend routing to the corresponding state/federal root. The three report indexes would become broader state indexes, so that scope change needs approval.
3. **Excluded agency entries:** 54 URLs were classified as explicit TCOLE exclusions by the retained intake audit. Recommend preserving those exclusions and recording exact URL absences rather than recreating placeholders.
4. **Cases:** Fresh inspection confirms six exact dockets in the retained `dev-copy` acquisition: Barrera, Clark, Eldreth, Ellis, Guymon, and Savell. All six are absent from the latest emitted artifact and current database. Van Kirk's exact docket is absent; the acquired same-title record has a different docket number. The earlier seven-case classification was incorrect. The other 50 cases retain their historical audit classification and were not rechecked in this scoped trace. See the current trace below.
5. **Other records:** The 29 agency URLs are named below. Antioch's approved retained ID is itself absent, so its duplicate cannot yet redirect to a valid retained page. Fifteen personnel were assigned only to excluded DHS/out-of-state entries; their own eligibility should be checked independently. Four more people need identity reconciliation: John Farmakes, Mario Rojas, Mark Hanneman, Tou Thao. The two omitted reports concern Renee Nicole Good and Alex Pretti. The user declined restoration on October 4; both exact URL absences are now recorded.
6. **Federal/media routing:** CBP, TSA, Coast Guard, and U.S. Marshals are resolved by exact preserved headquarters IDs/slugs. Current headquarters records eliminate the historical Customs predecessor and San Antonio office ambiguities. All four direct aliases are implemented. The two watch URLs concern the Lotts civil case and First Amendment retaliation report. The user expects the nested watch pages to remain. No approval for their removal has been established. Treat missing watch functionality and link identity as release blockers, not ordinary parent-page redirects.

## Evidence and limits

- Prior URL list: `/tmp/pc-release-redirect-details-20261004.log`, a full-output execution of the existing checker against the production sitemap and preserved `dist/`.
- Current record absence and unchanged-slug comparisons were queried on October 4; retained production reference: `intake-workspace/dev-copy/audits/rebuild-20260927/production-reference-text-tables.sql` and `intake-workspace/dev/backups/reference-20260814/`.
- Historical intake dispositions: `intake-workspace/dev-copy/audits/rebuild-20260926/published-absent-slugs.csv`. They explain prior decisions/input coverage; current source eligibility has not been re-audited for all records.
- Approved retained federal/Texas identities: `intake-workspace/dev-copy/audits/production-local-roots-20260927/agency-survivor-selection.json`. Minnesota duplicate omissions are recorded in the historical intake disposition audit; the user approved redirecting the seven listed MN/TX duplicate records in this session.
- The trace and preserved build are historical evidence. Subsequent intake mutations and absence decisions are recorded in the dated updates above. The final production build still needs its own coverage run.

## Pre-merge and deployment order

Before merge, run source validation, redirect tests, and checks against the preserved build without publishing. The shared router can be tested in AWS DEVELOPMENT without publishing LIVE. Local deploy scripts have no branch-name or merge requirement.

After the other checks, build the intended production artifact with production canonical URLs and crawl settings, validate its complete redirect map, and run built search/page tests. Production content, the `r:prod:` map, and router activation must be coordinated so the new router never points readers at missing destinations. First activation is staged: provision/configure the selected store, load the matching map, test DEVELOPMENT, and publish LIVE at deployment time. A broad Terraform apply is not the initial activation procedure because the function resources publish immediately. Existing production content must not receive the preview map.

Production activation is a deployment-time step, not a requirement that must be performed before merging. It can be executed from a reviewed local branch if explicitly desired; merging to main first is also compatible with the local scripts. Neither a production build nor activation is performed by this follow-up.

## Exact URL inventory

### Built noindex page (1)

Checker fix; no URL decision.

| Legacy URL | Record / identity | Evidence                      |
| ---------- | ----------------- | ----------------------------- |
| `/verify/` | —                 | dist/verify/index.html exists |

### Approved duplicate redirects (11)

Add direct redirect (authorized).

| Legacy URL                                                              | Record / identity | Evidence                                                                                                      |
| ----------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `/law-enforcement-agency/federal/atf/`                                  | —                 | Retained destination `/dc/district-of-columbia/washington/u-s-bureau-of-alcohol-tobacco-and-firearms-f6cd18/` |
| `/law-enforcement-agency/federal/dea/`                                  | —                 | Retained destination `/va/fairfax-county/west-springfield/u-s-drug-enforcement-administration-04c753/`        |
| `/law-enforcement-agency/federal/fbi/`                                  | —                 | Retained destination `/dc/district-of-columbia/washington/u-s-federal-bureau-of-investigation-ca5492/`        |
| `/law-enforcement-agency/federal/usss/`                                 | —                 | Retained destination `/dc/district-of-columbia/washington/u-s-secret-service-06ce24/`                         |
| `/law-enforcement-agency/mn/brooklyn-center-police-department-mn-ypgp/` | —                 | Retained destination `/mn/hennepin-county/brooklyn-center/brooklyn-center-police-dept-orn6ge/`                |
| `/law-enforcement-agency/mn/minneapolis-police-department-mn-n6rd/`     | —                 | Retained destination `/mn/hennepin-county/minneapolis/minneapolis-police-dept-gs3yan/`                        |
| `/law-enforcement-agency/mn/minnesota-state-patrol-d4e5f6/`             | —                 | Retained destination `/mn/ramsey-county/st-paul/minnesota-state-patrol-j74k70/`                               |
| `/law-enforcement-agency/mn/st-anthony-police-department-mn-tbh3/`      | —                 | Retained destination `/mn/hennepin-county/st-anthony/st-anthony-police-dept-bbzu2n/`                          |
| `/law-enforcement-agency/tx/dallas-police-department-tx-woyv/`          | —                 | Retained destination `/tx/dallas-county/dallas/dallas-police-department-d32dea/`                              |
| `/law-enforcement-agency/tx/fort-worth-police-department-tx-py90/`      | —                 | Retained destination `/tx/tarrant-county/fort-worth/fort-worth-police-department-a80e5e/`                     |
| `/law-enforcement-agency/tx/texas-department-of-public-safety-tx-28dj/` | —                 | Retained destination `/tx/travis-county/austin/texas-department-of-public-safety-7f40bb/`                     |

### State/category pages without a built state page (230)

Recommend exact absence records for this release; revisit when records populate that state.

| Legacy URL                    | Record / identity | Evidence                       |
| ----------------------------- | ----------------- | ------------------------------ |
| `/ak/`                        | —                 | No generated state root for AK |
| `/al/`                        | —                 | No generated state root for AL |
| `/ar/`                        | —                 | No generated state root for AR |
| `/az/`                        | —                 | No generated state root for AZ |
| `/ca/`                        | —                 | No generated state root for CA |
| `/civil-litigation/ak/`       | —                 | No generated state root for AK |
| `/civil-litigation/al/`       | —                 | No generated state root for AL |
| `/civil-litigation/ar/`       | —                 | No generated state root for AR |
| `/civil-litigation/az/`       | —                 | No generated state root for AZ |
| `/civil-litigation/ca/`       | —                 | No generated state root for CA |
| `/civil-litigation/co/`       | —                 | No generated state root for CO |
| `/civil-litigation/ct/`       | —                 | No generated state root for CT |
| `/civil-litigation/de/`       | —                 | No generated state root for DE |
| `/civil-litigation/fl/`       | —                 | No generated state root for FL |
| `/civil-litigation/ga/`       | —                 | No generated state root for GA |
| `/civil-litigation/hi/`       | —                 | No generated state root for HI |
| `/civil-litigation/ia/`       | —                 | No generated state root for IA |
| `/civil-litigation/id/`       | —                 | No generated state root for ID |
| `/civil-litigation/in/`       | —                 | No generated state root for IN |
| `/civil-litigation/ks/`       | —                 | No generated state root for KS |
| `/civil-litigation/ky/`       | —                 | No generated state root for KY |
| `/civil-litigation/la/`       | —                 | No generated state root for LA |
| `/civil-litigation/ma/`       | —                 | No generated state root for MA |
| `/civil-litigation/md/`       | —                 | No generated state root for MD |
| `/civil-litigation/me/`       | —                 | No generated state root for ME |
| `/civil-litigation/mi/`       | —                 | No generated state root for MI |
| `/civil-litigation/mo/`       | —                 | No generated state root for MO |
| `/civil-litigation/ms/`       | —                 | No generated state root for MS |
| `/civil-litigation/mt/`       | —                 | No generated state root for MT |
| `/civil-litigation/nc/`       | —                 | No generated state root for NC |
| `/civil-litigation/nd/`       | —                 | No generated state root for ND |
| `/civil-litigation/ne/`       | —                 | No generated state root for NE |
| `/civil-litigation/nh/`       | —                 | No generated state root for NH |
| `/civil-litigation/nj/`       | —                 | No generated state root for NJ |
| `/civil-litigation/nm/`       | —                 | No generated state root for NM |
| `/civil-litigation/nv/`       | —                 | No generated state root for NV |
| `/civil-litigation/ny/`       | —                 | No generated state root for NY |
| `/civil-litigation/oh/`       | —                 | No generated state root for OH |
| `/civil-litigation/ok/`       | —                 | No generated state root for OK |
| `/civil-litigation/or/`       | —                 | No generated state root for OR |
| `/civil-litigation/pa/`       | —                 | No generated state root for PA |
| `/civil-litigation/ri/`       | —                 | No generated state root for RI |
| `/civil-litigation/sc/`       | —                 | No generated state root for SC |
| `/civil-litigation/sd/`       | —                 | No generated state root for SD |
| `/civil-litigation/tn/`       | —                 | No generated state root for TN |
| `/civil-litigation/ut/`       | —                 | No generated state root for UT |
| `/civil-litigation/vt/`       | —                 | No generated state root for VT |
| `/civil-litigation/wa/`       | —                 | No generated state root for WA |
| `/civil-litigation/wi/`       | —                 | No generated state root for WI |
| `/civil-litigation/wv/`       | —                 | No generated state root for WV |
| `/civil-litigation/wy/`       | —                 | No generated state root for WY |
| `/co/`                        | —                 | No generated state root for CO |
| `/ct/`                        | —                 | No generated state root for CT |
| `/de/`                        | —                 | No generated state root for DE |
| `/fl/`                        | —                 | No generated state root for FL |
| `/ga/`                        | —                 | No generated state root for GA |
| `/hi/`                        | —                 | No generated state root for HI |
| `/ia/`                        | —                 | No generated state root for IA |
| `/id/`                        | —                 | No generated state root for ID |
| `/in/`                        | —                 | No generated state root for IN |
| `/ks/`                        | —                 | No generated state root for KS |
| `/ky/`                        | —                 | No generated state root for KY |
| `/la/`                        | —                 | No generated state root for LA |
| `/law-enforcement-agency/ak/` | —                 | No generated state root for AK |
| `/law-enforcement-agency/al/` | —                 | No generated state root for AL |
| `/law-enforcement-agency/ar/` | —                 | No generated state root for AR |
| `/law-enforcement-agency/az/` | —                 | No generated state root for AZ |
| `/law-enforcement-agency/ca/` | —                 | No generated state root for CA |
| `/law-enforcement-agency/co/` | —                 | No generated state root for CO |
| `/law-enforcement-agency/ct/` | —                 | No generated state root for CT |
| `/law-enforcement-agency/de/` | —                 | No generated state root for DE |
| `/law-enforcement-agency/fl/` | —                 | No generated state root for FL |
| `/law-enforcement-agency/ga/` | —                 | No generated state root for GA |
| `/law-enforcement-agency/hi/` | —                 | No generated state root for HI |
| `/law-enforcement-agency/ia/` | —                 | No generated state root for IA |
| `/law-enforcement-agency/id/` | —                 | No generated state root for ID |
| `/law-enforcement-agency/in/` | —                 | No generated state root for IN |
| `/law-enforcement-agency/ks/` | —                 | No generated state root for KS |
| `/law-enforcement-agency/ky/` | —                 | No generated state root for KY |
| `/law-enforcement-agency/la/` | —                 | No generated state root for LA |
| `/law-enforcement-agency/ma/` | —                 | No generated state root for MA |
| `/law-enforcement-agency/md/` | —                 | No generated state root for MD |
| `/law-enforcement-agency/me/` | —                 | No generated state root for ME |
| `/law-enforcement-agency/mi/` | —                 | No generated state root for MI |
| `/law-enforcement-agency/mo/` | —                 | No generated state root for MO |
| `/law-enforcement-agency/ms/` | —                 | No generated state root for MS |
| `/law-enforcement-agency/mt/` | —                 | No generated state root for MT |
| `/law-enforcement-agency/nc/` | —                 | No generated state root for NC |
| `/law-enforcement-agency/nd/` | —                 | No generated state root for ND |
| `/law-enforcement-agency/ne/` | —                 | No generated state root for NE |
| `/law-enforcement-agency/nh/` | —                 | No generated state root for NH |
| `/law-enforcement-agency/nj/` | —                 | No generated state root for NJ |
| `/law-enforcement-agency/nm/` | —                 | No generated state root for NM |
| `/law-enforcement-agency/nv/` | —                 | No generated state root for NV |
| `/law-enforcement-agency/ny/` | —                 | No generated state root for NY |
| `/law-enforcement-agency/oh/` | —                 | No generated state root for OH |
| `/law-enforcement-agency/ok/` | —                 | No generated state root for OK |
| `/law-enforcement-agency/or/` | —                 | No generated state root for OR |
| `/law-enforcement-agency/pa/` | —                 | No generated state root for PA |
| `/law-enforcement-agency/ri/` | —                 | No generated state root for RI |
| `/law-enforcement-agency/sc/` | —                 | No generated state root for SC |
| `/law-enforcement-agency/sd/` | —                 | No generated state root for SD |
| `/law-enforcement-agency/tn/` | —                 | No generated state root for TN |
| `/law-enforcement-agency/ut/` | —                 | No generated state root for UT |
| `/law-enforcement-agency/vt/` | —                 | No generated state root for VT |
| `/law-enforcement-agency/wa/` | —                 | No generated state root for WA |
| `/law-enforcement-agency/wi/` | —                 | No generated state root for WI |
| `/law-enforcement-agency/wv/` | —                 | No generated state root for WV |
| `/law-enforcement-agency/wy/` | —                 | No generated state root for WY |
| `/ma/`                        | —                 | No generated state root for MA |
| `/md/`                        | —                 | No generated state root for MD |
| `/me/`                        | —                 | No generated state root for ME |
| `/mi/`                        | —                 | No generated state root for MI |
| `/mo/`                        | —                 | No generated state root for MO |
| `/ms/`                        | —                 | No generated state root for MS |
| `/mt/`                        | —                 | No generated state root for MT |
| `/nc/`                        | —                 | No generated state root for NC |
| `/nd/`                        | —                 | No generated state root for ND |
| `/ne/`                        | —                 | No generated state root for NE |
| `/nh/`                        | —                 | No generated state root for NH |
| `/nj/`                        | —                 | No generated state root for NJ |
| `/nm/`                        | —                 | No generated state root for NM |
| `/nv/`                        | —                 | No generated state root for NV |
| `/ny/`                        | —                 | No generated state root for NY |
| `/oh/`                        | —                 | No generated state root for OH |
| `/ok/`                        | —                 | No generated state root for OK |
| `/or/`                        | —                 | No generated state root for OR |
| `/pa/`                        | —                 | No generated state root for PA |
| `/personnel/ak/`              | —                 | No generated state root for AK |
| `/personnel/al/`              | —                 | No generated state root for AL |
| `/personnel/ar/`              | —                 | No generated state root for AR |
| `/personnel/az/`              | —                 | No generated state root for AZ |
| `/personnel/ca/`              | —                 | No generated state root for CA |
| `/personnel/co/`              | —                 | No generated state root for CO |
| `/personnel/ct/`              | —                 | No generated state root for CT |
| `/personnel/de/`              | —                 | No generated state root for DE |
| `/personnel/fl/`              | —                 | No generated state root for FL |
| `/personnel/ga/`              | —                 | No generated state root for GA |
| `/personnel/hi/`              | —                 | No generated state root for HI |
| `/personnel/ia/`              | —                 | No generated state root for IA |
| `/personnel/id/`              | —                 | No generated state root for ID |
| `/personnel/in/`              | —                 | No generated state root for IN |
| `/personnel/ks/`              | —                 | No generated state root for KS |
| `/personnel/ky/`              | —                 | No generated state root for KY |
| `/personnel/la/`              | —                 | No generated state root for LA |
| `/personnel/ma/`              | —                 | No generated state root for MA |
| `/personnel/md/`              | —                 | No generated state root for MD |
| `/personnel/me/`              | —                 | No generated state root for ME |
| `/personnel/mi/`              | —                 | No generated state root for MI |
| `/personnel/mo/`              | —                 | No generated state root for MO |
| `/personnel/ms/`              | —                 | No generated state root for MS |
| `/personnel/mt/`              | —                 | No generated state root for MT |
| `/personnel/nc/`              | —                 | No generated state root for NC |
| `/personnel/nd/`              | —                 | No generated state root for ND |
| `/personnel/ne/`              | —                 | No generated state root for NE |
| `/personnel/nh/`              | —                 | No generated state root for NH |
| `/personnel/nj/`              | —                 | No generated state root for NJ |
| `/personnel/nm/`              | —                 | No generated state root for NM |
| `/personnel/nv/`              | —                 | No generated state root for NV |
| `/personnel/ny/`              | —                 | No generated state root for NY |
| `/personnel/oh/`              | —                 | No generated state root for OH |
| `/personnel/ok/`              | —                 | No generated state root for OK |
| `/personnel/or/`              | —                 | No generated state root for OR |
| `/personnel/pa/`              | —                 | No generated state root for PA |
| `/personnel/ri/`              | —                 | No generated state root for RI |
| `/personnel/sc/`              | —                 | No generated state root for SC |
| `/personnel/sd/`              | —                 | No generated state root for SD |
| `/personnel/tn/`              | —                 | No generated state root for TN |
| `/personnel/ut/`              | —                 | No generated state root for UT |
| `/personnel/vt/`              | —                 | No generated state root for VT |
| `/personnel/wa/`              | —                 | No generated state root for WA |
| `/personnel/wi/`              | —                 | No generated state root for WI |
| `/personnel/wv/`              | —                 | No generated state root for WV |
| `/personnel/wy/`              | —                 | No generated state root for WY |
| `/report/ak/`                 | —                 | No generated state root for AK |
| `/report/al/`                 | —                 | No generated state root for AL |
| `/report/ar/`                 | —                 | No generated state root for AR |
| `/report/az/`                 | —                 | No generated state root for AZ |
| `/report/ca/`                 | —                 | No generated state root for CA |
| `/report/co/`                 | —                 | No generated state root for CO |
| `/report/ct/`                 | —                 | No generated state root for CT |
| `/report/de/`                 | —                 | No generated state root for DE |
| `/report/fl/`                 | —                 | No generated state root for FL |
| `/report/ga/`                 | —                 | No generated state root for GA |
| `/report/hi/`                 | —                 | No generated state root for HI |
| `/report/ia/`                 | —                 | No generated state root for IA |
| `/report/id/`                 | —                 | No generated state root for ID |
| `/report/in/`                 | —                 | No generated state root for IN |
| `/report/ks/`                 | —                 | No generated state root for KS |
| `/report/ky/`                 | —                 | No generated state root for KY |
| `/report/la/`                 | —                 | No generated state root for LA |
| `/report/ma/`                 | —                 | No generated state root for MA |
| `/report/md/`                 | —                 | No generated state root for MD |
| `/report/me/`                 | —                 | No generated state root for ME |
| `/report/mi/`                 | —                 | No generated state root for MI |
| `/report/mo/`                 | —                 | No generated state root for MO |
| `/report/ms/`                 | —                 | No generated state root for MS |
| `/report/mt/`                 | —                 | No generated state root for MT |
| `/report/nc/`                 | —                 | No generated state root for NC |
| `/report/nd/`                 | —                 | No generated state root for ND |
| `/report/ne/`                 | —                 | No generated state root for NE |
| `/report/nh/`                 | —                 | No generated state root for NH |
| `/report/nj/`                 | —                 | No generated state root for NJ |
| `/report/nm/`                 | —                 | No generated state root for NM |
| `/report/nv/`                 | —                 | No generated state root for NV |
| `/report/ny/`                 | —                 | No generated state root for NY |
| `/report/oh/`                 | —                 | No generated state root for OH |
| `/report/ok/`                 | —                 | No generated state root for OK |
| `/report/or/`                 | —                 | No generated state root for OR |
| `/report/pa/`                 | —                 | No generated state root for PA |
| `/report/ri/`                 | —                 | No generated state root for RI |
| `/report/sc/`                 | —                 | No generated state root for SC |
| `/report/sd/`                 | —                 | No generated state root for SD |
| `/report/tn/`                 | —                 | No generated state root for TN |
| `/report/ut/`                 | —                 | No generated state root for UT |
| `/report/vt/`                 | —                 | No generated state root for VT |
| `/report/wa/`                 | —                 | No generated state root for WA |
| `/report/wi/`                 | —                 | No generated state root for WI |
| `/report/wv/`                 | —                 | No generated state root for WV |
| `/report/wy/`                 | —                 | No generated state root for WY |
| `/ri/`                        | —                 | No generated state root for RI |
| `/sc/`                        | —                 | No generated state root for SC |
| `/sd/`                        | —                 | No generated state root for SD |
| `/tn/`                        | —                 | No generated state root for TN |
| `/ut/`                        | —                 | No generated state root for UT |
| `/vt/`                        | —                 | No generated state root for VT |
| `/wa/`                        | —                 | No generated state root for WA |
| `/wi/`                        | —                 | No generated state root for WI |
| `/wv/`                        | —                 | No generated state root for WV |
| `/wy/`                        | —                 | No generated state root for WY |

### Collection and pagination routing (68)

Recommend redirect to the corresponding state/federal index; TX pagination goes to /tx/.

| Legacy URL                            | Record / identity | Evidence                               |
| ------------------------------------- | ----------------- | -------------------------------------- |
| `/civil-litigation/federal/`          | —                 | Existing state/federal root: /federal/ |
| `/law-enforcement-agency/dc/`         | —                 | Existing state/federal root: /dc/      |
| `/law-enforcement-agency/federal/`    | —                 | Existing state/federal root: /federal/ |
| `/law-enforcement-agency/il/`         | —                 | Existing state/federal root: /il/      |
| `/law-enforcement-agency/mn/`         | —                 | Existing state/federal root: /mn/      |
| `/law-enforcement-agency/tx/`         | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/2/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/3/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/4/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/5/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/6/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/7/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/8/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/9/`  | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/10/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/11/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/12/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/13/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/14/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/15/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/16/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/17/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/18/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/19/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/20/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/21/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/22/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/23/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/24/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/25/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/26/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/27/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/28/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/29/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/30/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/31/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/32/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/33/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/34/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/35/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/36/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/37/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/38/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/39/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/40/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/41/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/42/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/43/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/44/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/45/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/46/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/47/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/48/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/49/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/50/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/51/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/52/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/53/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/54/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/55/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/56/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/57/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/58/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/tx/page/59/` | —                 | Existing state/federal root: /tx/      |
| `/law-enforcement-agency/va/`         | —                 | Existing state/federal root: /va/      |
| `/report/dc/`                         | —                 | Existing state/federal root: /dc/      |
| `/report/il/`                         | —                 | Existing state/federal root: /il/      |
| `/report/va/`                         | —                 | Existing state/federal root: /va/      |

### Already excluded agency placeholders (54)

Recommend exact absence records; do not restore excluded records.

| Legacy URL                                                                  | Record / identity                        | Evidence                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/law-enforcement-agency/in/state-of-indiana-6087b7/`                       | State of Indiana                         | Explicit TCOLE exclusion; out-of-jurisdiction placeholder (a US state, not a TX agency) with no address, city, or zip in the source — not geocodable and no location data available                                                                 |
| `/law-enforcement-agency/ok/state-of-oklahoma-2708ac/`                      | State of Oklahoma                        | Explicit TCOLE exclusion; STATE OF OKLAHOMA is an administrative placeholder, not a physical agency office; source address is NULL, Oklahoma City, OK 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses. |
| `/law-enforcement-agency/tx/carroll-troberman-pllc-56c45f/`                 | Carroll Troberman, Pllc                  | Explicit TCOLE exclusion; Carroll Troberman administrative placeholder                                                                                                                                                                              |
| `/law-enforcement-agency/tx/department-of-homeland-security-a5e66e/`        | Department of Homeland Security          | Explicit TCOLE exclusion; DHS placeholder has address 0, X, TX 0; excluded as requested.                                                                                                                                                            |
| `/law-enforcement-agency/tx/dist-of-columbia-7a269a/`                       | Dist. of Columbia                        | Explicit TCOLE exclusion; DIST. OF COLUMBIA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/foreign-service-cd702d/`                        | Foreign Service                          | Explicit TCOLE exclusion; Foreign Service is an administrative placeholder, not a physical agency office; source address is 12t, Abbott, TX 78723. User authorized exclusion of placeholders with bogus or missing office addresses.                |
| `/law-enforcement-agency/tx/state-of-alabama-ea9544/`                       | State of Alabama                         | Explicit TCOLE exclusion; STATE OF ALABAMA is an out-of-jurisdiction administrative placeholder, not a Texas agency; source address is NULL, ABBOTT, TX 00000-0000.                                                                                 |
| `/law-enforcement-agency/tx/state-of-alaska-68daa2/`                        | State of Alaska                          | Explicit TCOLE exclusion; STATE OF ALASKA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.          |
| `/law-enforcement-agency/tx/state-of-arizona-9dfb20/`                       | State of Arizona                         | Explicit TCOLE exclusion; STATE OF ARIZONA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |
| `/law-enforcement-agency/tx/state-of-arkansas-3696b0/`                      | State of Arkansas                        | Explicit TCOLE exclusion; STATE OF ARKANSAS is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-california-537079/`                    | State of California                      | Explicit TCOLE exclusion; STATE OF CALIFORNIA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.      |
| `/law-enforcement-agency/tx/state-of-colorado-b884aa/`                      | State of Colorado                        | Explicit TCOLE exclusion; STATE OF COLORADO is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-connecticut-fa01c1/`                   | State of Connecticut                     | Explicit TCOLE exclusion; STATE OF CONNECTICUT is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.     |
| `/law-enforcement-agency/tx/state-of-delaware-ec2ad2/`                      | State of Delaware                        | Explicit TCOLE exclusion; STATE OF DELAWARE is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-florida-57bf09/`                       | State of Florida                         | Explicit TCOLE exclusion; STATE OF FLORIDA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |
| `/law-enforcement-agency/tx/state-of-georgia-5a9eae/`                       | State of Georgia                         | Explicit TCOLE exclusion; STATE OF GEORGIA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |
| `/law-enforcement-agency/tx/state-of-hawaii-543938/`                        | State of Hawaii                          | Explicit TCOLE exclusion; STATE OF HAWAII is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.          |
| `/law-enforcement-agency/tx/state-of-idaho-626e15/`                         | State of Idaho                           | Explicit TCOLE exclusion; STATE OF IDAHO is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.           |
| `/law-enforcement-agency/tx/state-of-illinois-36262b/`                      | State of Illinois                        | Explicit TCOLE exclusion; STATE OF ILLINOIS is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-iowa-72a201/`                          | State of Iowa                            | Explicit TCOLE exclusion; STATE OF IOWA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.            |
| `/law-enforcement-agency/tx/state-of-kansas-9b403f/`                        | State of Kansas                          | Explicit TCOLE exclusion; STATE OF KANSAS is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.          |
| `/law-enforcement-agency/tx/state-of-kentucky-d62626/`                      | State of Kentucky                        | Explicit TCOLE exclusion; STATE OF KENTUCKY is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-louisiana-8c941c/`                     | State of Louisiana                       | Explicit TCOLE exclusion; STATE OF LOUISIANA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.       |
| `/law-enforcement-agency/tx/state-of-maine-c75eb2/`                         | State of Maine                           | Explicit TCOLE exclusion; STATE OF MAINE is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.           |
| `/law-enforcement-agency/tx/state-of-maryland-3b3c91/`                      | State of Maryland                        | Explicit TCOLE exclusion; STATE OF MARYLAND is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-massachusetts-e88a5c/`                 | State of Massachusetts                   | Explicit TCOLE exclusion; STATE OF MASSACHUSETTS is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.   |
| `/law-enforcement-agency/tx/state-of-michigan-376052/`                      | State of Michigan                        | Explicit TCOLE exclusion; STATE OF MICHIGAN is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-minnesota-26c4de/`                     | State of Minnesota                       | Explicit TCOLE exclusion; STATE OF MINNESOTA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.       |
| `/law-enforcement-agency/tx/state-of-mississippi-90c1ab/`                   | State of Mississippi                     | Explicit TCOLE exclusion; STATE OF MISSISSIPPI is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.     |
| `/law-enforcement-agency/tx/state-of-missouri-eb6d76/`                      | State of Missouri                        | Explicit TCOLE exclusion; STATE OF MISSOURI is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-montana-295146/`                       | State of Montana                         | Explicit TCOLE exclusion; STATE OF MONTANA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |
| `/law-enforcement-agency/tx/state-of-nebraska-542361/`                      | State of Nebraska                        | Explicit TCOLE exclusion; STATE OF NEBRASKA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-nevada-8c25d5/`                        | State of Nevada                          | Explicit TCOLE exclusion; STATE OF NEVADA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.          |
| `/law-enforcement-agency/tx/state-of-new-hampshire-da078d/`                 | State of New Hampshire                   | Explicit TCOLE exclusion; STATE OF NEW HAMPSHIRE is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.   |
| `/law-enforcement-agency/tx/state-of-new-jersey-ad1719/`                    | State of New Jersey                      | Explicit TCOLE exclusion; STATE OF NEW JERSEY is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.      |
| `/law-enforcement-agency/tx/state-of-new-mexico-82bce6/`                    | State of New Mexico                      | Explicit TCOLE exclusion; STATE OF NEW MEXICO is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.      |
| `/law-enforcement-agency/tx/state-of-new-york-aa4e42/`                      | State of New York                        | Explicit TCOLE exclusion; STATE OF NEW YORK is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-north-carolina-001c51/`                | State of North Carolina                  | Explicit TCOLE exclusion; STATE OF NORTH CAROLINA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.  |
| `/law-enforcement-agency/tx/state-of-north-dakota-4e461e/`                  | State of North Dakota                    | Explicit TCOLE exclusion; STATE OF NORTH DAKOTA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.    |
| `/law-enforcement-agency/tx/state-of-ohio-01b127/`                          | State of Ohio                            | Explicit TCOLE exclusion; STATE OF OHIO is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.            |
| `/law-enforcement-agency/tx/state-of-oregon-a0bd0d/`                        | State of Oregon                          | Explicit TCOLE exclusion; STATE OF OREGON is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.          |
| `/law-enforcement-agency/tx/state-of-pennsylvania-3cf771/`                  | State of Pennsylvania                    | Explicit TCOLE exclusion; STATE OF PENNSYLVANIA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.    |
| `/law-enforcement-agency/tx/state-of-rhode-island-c70720/`                  | State of Rhode Island                    | Explicit TCOLE exclusion; STATE OF RHODE ISLAND is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.    |
| `/law-enforcement-agency/tx/state-of-south-carolina-87e9a9/`                | State of South Carolina                  | Explicit TCOLE exclusion; STATE OF SOUTH CAROLINA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.  |
| `/law-enforcement-agency/tx/state-of-south-dakota-c3caeb/`                  | State of South Dakota                    | Explicit TCOLE exclusion; STATE OF SOUTH DAKOTA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.    |
| `/law-enforcement-agency/tx/state-of-tennessee-f3eaac/`                     | State of Tennessee                       | Explicit TCOLE exclusion; STATE OF TENNESSEE is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.       |
| `/law-enforcement-agency/tx/state-of-texas-authorized-service-time-2c2468/` | State of Texas - Authorized Service Time | Explicit TCOLE exclusion; State of Texas authorized service administrative placeholder                                                                                                                                                              |
| `/law-enforcement-agency/tx/state-of-utah-369fbd/`                          | State of Utah                            | Explicit TCOLE exclusion; STATE OF UTAH is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.            |
| `/law-enforcement-agency/tx/state-of-vermont-883068/`                       | State of Vermont                         | Explicit TCOLE exclusion; STATE OF VERMONT is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |
| `/law-enforcement-agency/tx/state-of-virginia-e2bd7b/`                      | State of Virginia                        | Explicit TCOLE exclusion; STATE OF VIRGINIA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.        |
| `/law-enforcement-agency/tx/state-of-washington-11b43a/`                    | State of Washington                      | Explicit TCOLE exclusion; STATE OF WASHINGTON is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.      |
| `/law-enforcement-agency/tx/state-of-west-virgina-2d0c46/`                  | State of West Virgina                    | Explicit TCOLE exclusion; STATE OF WEST VIRGINA is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.    |
| `/law-enforcement-agency/tx/state-of-wisconsin-2e62c7/`                     | State of Wisconsin                       | Explicit TCOLE exclusion; STATE OF WISCONSIN is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.       |
| `/law-enforcement-agency/tx/state-of-wyoming-5e8500/`                       | State of Wyoming                         | Explicit TCOLE exclusion; STATE OF WYOMING is an administrative placeholder, not a physical agency office; source address is NULL, ABBOTT, TX 00000-0000. User authorized exclusion of placeholders with bogus or missing office addresses.         |

### Cases outside selected input (50)

These 50 cases retain their historical classification below; they were not rechecked in the seven-case trace above.

| Legacy URL                                                                                | Record / identity                                      | Evidence                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `/civil-litigation/al/washington-v-city-of-reform-7-25-cv-00138-n-d-ala-2025/`            | Washington v. City of Reform                           | Legacy case absent; docket not in selected CourtListener input; docket 7:25-cv-00138               |
| `/civil-litigation/ca/allen-v-city-of-antioch-3-23-cv-01895-n-d-cal-2023/`                | Allen v. City of Antioch (Antioch PD racist texts)     | Legacy case absent; docket not in selected CourtListener input; docket 3:23-cv-01895               |
| `/civil-litigation/ca/clark-v-city-of-sacramento-2-19-cv-00171-e-d-cal-2019/`             | Clark v. City of Sacramento (Stephon Clark)            | Legacy case absent; docket not in selected CourtListener input; docket 2:19-cv-00171               |
| `/civil-litigation/ca/grant-v-bart-3-09-cv-04835-n-d-cal-2009/`                           | Grant v. Bay Area Rapid Transit District (Oscar Grant) | Legacy case absent; docket not in selected CourtListener input; docket 3:09-cv-04835               |
| `/civil-litigation/ca/im-v-state-of-california-2-20-cv-11174-c-d-cal-2020/`               | I.M. v. State of California (Edward Bronstein)         | Legacy case absent; docket not in selected CourtListener input; docket 2:20-cv-11174               |
| `/civil-litigation/ca/swaine-v-city-of-torrance-2-22-cv-00404-c-d-cal-2022/`              | Kiley Deliefde Swaine v. City of Torrance              | Legacy case absent; docket not in selected CourtListener input; docket 2:22-cv-00404               |
| `/civil-litigation/co/estate-of-mcclain-v-city-of-aurora-1-20-cv-02389-d-colo-2020/`      | Estate of McClain v. City of Aurora                    | Legacy case absent; docket not in selected CourtListener input; docket 1:20-cv-02389               |
| `/civil-litigation/ct/cox-v-city-of-new-haven-3-22-cv-01209-d-conn-2022/`                 | Cox v. City of New Haven (Randy Cox)                   | Legacy case absent; docket not in selected CourtListener input; docket 3:22-cv-01209               |
| `/civil-litigation/fl/8-25-cv-02790-a7b42c/`                                              | Cadle v. Judd et al                                    | Legacy case absent; docket not in selected CourtListener input; docket 8:25-cv-02790               |
| `/civil-litigation/ga/miller-v-city-of-atlanta-1-21-cv-03752-n-d-ga-2021/`                | Miller v. City of Atlanta (Rayshard Brooks)            | Legacy case absent; docket not in selected CourtListener input; docket 1:21-cv-03752               |
| `/civil-litigation/ia/galanakis-v-city-of-newton-iowa-4-23-cv-00044-s-d-iowa-2023/`       | Galanakis v. City of Newton, Iowa                      | Legacy case absent; docket not in selected CourtListener input; docket 4:23-cv-00044               |
| `/civil-litigation/il/massey-v-sangamon-county-il-2024/`                                  | Massey v. Sangamon County                              | Legacy case absent; docket not in selected CourtListener input; docket MASSEY-SANGAMON-2024        |
| `/civil-litigation/il/mcdonald-v-city-of-chicago-il-2015/`                                | McDonald v. City of Chicago                            | Legacy case absent; docket not in selected CourtListener input; docket MCDONALD-CHICAGO-2015       |
| `/civil-litigation/ky/taylor-v-city-of-louisville-20-ci-003134-jefferson-cir-ky-2020/`    | Palmer v. City of Louisville (Breonna Taylor)          | Legacy case absent; docket not in selected CourtListener input; docket 20-CI-003134                |
| `/civil-litigation/la/dilley-v-state-of-louisiana-3-19-cv-00391-m-d-la-2019/`             | Dilley v. State of Louisiana                           | Legacy case absent; docket not in selected CourtListener input; docket 3:19-cv-00391               |
| `/civil-litigation/md/gray-v-city-of-baltimore-pre-litigation-baltimore-md-2015/`         | Gray v. City of Baltimore (Freddie Gray)               | Legacy case absent; docket not in selected CourtListener input; docket GRAY-BALTIMORE-2015         |
| `/civil-litigation/mi/lyoya-v-city-of-grand-rapids-1-22-cv-01160-w-d-mich-2022/`          | Lyoya v. City of Grand Rapids                          | Legacy case absent; docket not in selected CourtListener input; docket 1:22-cv-01160               |
| `/civil-litigation/mn/castile-v-city-of-st-anthony-pre-litigation-mn-2017/`               | Castile v. City of St. Anthony (Philando Castile)      | Legacy case absent; docket not in selected CourtListener input; docket CASTILE-ST-ANTHONY-2017     |
| `/civil-litigation/mn/floyd-v-city-of-minneapolis-0-20-cv-01577-d-minn-2020/`             | Floyd v. City of Minneapolis (Schaffer v. Chauvin)     | Legacy case absent; docket not in selected CourtListener input; docket 0:20-cv-01577               |
| `/civil-litigation/mn/wright-v-city-of-brooklyn-center-mn-2021/`                          | Wright v. City of Brooklyn Center                      | Legacy case absent; docket not in selected CourtListener input; docket WRIGHT-BROOKLYN-CENTER-2021 |
| `/civil-litigation/ny/bell-v-city-of-new-york-1-07-cv-02994-e-d-n-y-2007/`                | Bell v. City of New York (Sean Bell)                   | Legacy case absent; docket not in selected CourtListener input; docket 1:07-cv-02994               |
| `/civil-litigation/ny/diallo-v-city-of-new-york-ny-2000/`                                 | Diallo v. City of New York (Amadou Diallo)             | Legacy case absent; docket not in selected CourtListener input; docket DIALLO-NYC-2000             |
| `/civil-litigation/ny/garner-v-city-of-new-york-pre-litigation-nyc-2015/`                 | Garner v. City of New York (Eric Garner)               | Legacy case absent; docket not in selected CourtListener input; docket GARNER-NYC-2015             |
| `/civil-litigation/ny/khaled-v-town-of-lloyd-1-25-cv-01172-n-d-n-y-2025/`                 | Khaled v. Town of Lloyd                                | Legacy case absent; docket not in selected CourtListener input; docket 1:25-cv-01172               |
| `/civil-litigation/ny/prude-v-city-of-rochester-6-20-cv-06675-w-d-n-y-2020/`              | Prude v. The City of Rochester                         | Legacy case absent; docket not in selected CourtListener input; docket 6:20-cv-06675               |
| `/civil-litigation/oh/cvh-20230069-19dc58/`                                               | Cooley v. Foreman AKA Afroman                          | Legacy case absent; docket not in selected CourtListener input; docket CVH-20230069                |
| `/civil-litigation/oh/hill-v-city-of-columbus-oh-2021/`                                   | Hill v. City of Columbus                               | Legacy case absent; docket not in selected CourtListener input; docket HILL-COLUMBUS-2021          |
| `/civil-litigation/oh/rice-v-city-of-cleveland-1-14-cv-02670-n-d-ohio-2014/`              | Rice v. City of Cleveland (Tamir Rice)                 | Legacy case absent; docket not in selected CourtListener input; docket 1:14-cv-02670               |
| `/civil-litigation/oh/walker-v-city-of-akron-5-23-cv-01205-n-d-ohio-2023/`                | Walker v. City of Akron                                | Legacy case absent; docket not in selected CourtListener input; docket 5:23-cv-01205               |
| `/civil-litigation/sc/scott-v-city-of-north-charleston-sc-2015/`                          | Scott v. City of North Charleston                      | Legacy case absent; docket not in selected CourtListener input; docket SCOTT-NORTH-CHARLESTON-2015 |
| `/civil-litigation/tn/wells-v-city-of-memphis-2-23-cv-02224-w-d-tenn-2023/`               | Wells v. City of Memphis (Tyre Nichols)                | Legacy case absent; docket not in selected CourtListener input; docket 2:23-cv-02224               |
| `/civil-litigation/tx/alrawaziq-v-city-of-irving-3-99-cv-00970-n-d-tex-1999/`             | Alrawaziq v. City of Irving                            | Legacy case absent; docket not in selected CourtListener input; docket 3:99-cv-00970               |
| `/civil-litigation/tx/caba-v-city-of-irving-3-96-cv-00249-n-d-tex-1996/`                  | Caba v. City of Irving                                 | Legacy case absent; docket not in selected CourtListener input; docket 3:96-cv-00249               |
| `/civil-litigation/tx/davis-v-city-of-irving-3-97-cv-02512-n-d-tex-1997/`                 | Davis v. City of Irving                                | Legacy case absent; docket not in selected CourtListener input; docket 3:97-cv-02512               |
| `/civil-litigation/tx/duke-v-city-of-irving-tx-3-20-cv-00116-k-n-d-tex-2020/`             | Duke v. City of Irving TX                              | Legacy case absent; docket not in selected CourtListener input; docket 3:20-cv-00116-K             |
| `/civil-litigation/tx/edwards-v-city-of-irving-3-90-cv-02603-n-d-tex-1990/`               | Edwards v. City of Irving                              | Legacy case absent; docket not in selected CourtListener input; docket 3:90-cv-02603               |
| `/civil-litigation/tx/hill-v-city-of-irving-3-91-cv-01190-n-d-tex-1991/`                  | Hill v. City of Irving                                 | Legacy case absent; docket not in selected CourtListener input; docket 3:91-cv-01190               |
| `/civil-litigation/tx/house-v-city-of-irving-texas-3-03-cv-02524-n-d-tex-2003/`           | House v. City of Irving, Texas                         | Legacy case absent; docket not in selected CourtListener input; docket 3:03-cv-02524               |
| `/civil-litigation/tx/howie-v-city-of-irving-texas-3-00-cv-02094-n-d-tex-2000/`           | Howie v. City of Irving Texas                          | Legacy case absent; docket not in selected CourtListener input; docket 3:00-cv-02094               |
| `/civil-litigation/tx/ivatury-v-city-of-irving-3-94-cv-01556-n-d-tex-1994/`               | Ivatury v. City of Irving                              | Legacy case absent; docket not in selected CourtListener input; docket 3:94-cv-01556               |
| `/civil-litigation/tx/jean-v-guyger-3-18-cv-02862-n-d-tex-2018/`                          | Jean v. Guyger (Botham Jean)                           | Legacy case absent; docket not in selected CourtListener input; docket 3:18-cv-02862               |
| `/civil-litigation/tx/langiano-v-city-of-fort-worth-4-21-cv-00808-n-d-tex-2021/`          | Langiano v. City of Fort Worth (Atatiana Jefferson)    | Legacy case absent; docket not in selected CourtListener input; docket 4:21-cv-00808               |
| `/civil-litigation/tx/nichols-v-city-of-irving-3-86-cv-02848-n-d-tex-1986/`               | Nichols v. City of Irving                              | Legacy case absent; docket not in selected CourtListener input; docket 3:86-cv-02848               |
| `/civil-litigation/tx/papke-v-city-of-irving-3-95-cv-02644-n-d-tex-1995/`                 | Papke v. City of Irving                                | Legacy case absent; docket not in selected CourtListener input; docket 3:95-cv-02644               |
| `/civil-litigation/tx/papke-v-city-of-irving-3-98-cv-00941-n-d-tex-1998/`                 | Papke v. City of Irving                                | Legacy case absent; docket not in selected CourtListener input; docket 3:98-cv-00941               |
| `/civil-litigation/tx/raper-v-city-of-irving-texas-3-95-cv-01275-n-d-tex-1995/`           | Raper v. City of Irving Texas                          | Legacy case absent; docket not in selected CourtListener input; docket 3:95-cv-01275               |
| `/civil-litigation/tx/reed-veal-v-encinia-4-15-cv-02232-s-d-tex-2015/`                    | Reed-Veal v. Encinia et al (Sandra Bland)              | Legacy case absent; docket not in selected CourtListener input; docket 4:15-cv-02232               |
| `/civil-litigation/tx/wallis-v-the-city-of-irving-3-07-cv-01483-n-d-tex-2007/`            | Wallis v. The City of Irving                           | Legacy case absent; docket not in selected CourtListener input; docket 3:07-cv-01483               |
| `/civil-litigation/tx/williams-v-city-of-irving-texas-et-al-3-15-cv-1701-l-n-d-tex-2015/` | Williams v. City of Irving, Texas et al                | Legacy case absent; docket not in selected CourtListener input; docket 3:15-CV-1701-L              |
| `/civil-litigation/wa/carter-mixon-v-city-of-tacoma-3-21-cv-05692-w-d-wash-2021/`         | Carter-Mixon v. City of Tacoma                         | Legacy case absent; docket not in selected CourtListener input; docket 3:21-cv-05692               |

### Cases previously classified as acquired (7)

Fresh trace above corrects this historical group: six exact acquired dockets and one absent exact docket. Preserve original IDs/slugs in any restoration; no substitute case redirect.

| Legacy URL                                                                                  | Record / identity                    | Evidence                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `/civil-litigation/tx/barrera-v-city-of-irving-et-al-3-25-cv-03160-n-d-tex-2025/`           | Barrera v. City of Irving et al      | Legacy case absent; docket exists in acquired CourtListener input; docket 3:25-cv-03160                   |
| `/civil-litigation/tx/clark-v-elmore-4-25-cv-01072-alm-bd-e-d-tex-2025/`                    | Clark et al v. Elmore et al          | Legacy case absent; docket exists in acquired CourtListener input; docket 4:25-cv-01072                   |
| `/civil-litigation/tx/eldreth-v-harris-county-texas-4-26-cv-01418-s-d-tex-2026/`            | Eldreth v. Harris County, Texas      | Legacy case absent; docket exists in acquired CourtListener input; docket 4:26-cv-01418                   |
| `/civil-litigation/tx/ellis-v-police-dept-of-irving-et-al-3-22-cv-00265-b-bn-n-d-tex-2022/` | Ellis v. Police Dept of Irving et al | Legacy case absent; docket exists in acquired CourtListener input; docket 3:22-cv-00265-B-BN              |
| `/civil-litigation/tx/guymon-v-carson-county-2-26-cv-00007-n-d-tex-2026/`                   | Guymon v. Carson County              | Legacy case absent; docket exists in acquired CourtListener input; docket 2:26-cv-00007                   |
| `/civil-litigation/tx/savell-v-galveston-police-deparment-3-26-cv-00060-s-d-tex-2026/`      | Savell v. Galveston Police Deparment | Legacy case absent; docket exists in acquired CourtListener input; docket 3:26-cv-00060                   |
| `/civil-litigation/tx/van-kirk-v-officer-hernandez-4-26-cv-02517-s-d-tex-2026/`             | Van Kirk v. Officer Hernandez        | Exact docket 4:26-cv-02517 absent; same title acquired under 4:26-cv-00000; identity equivalence unproven |

### Legacy agencies absent from intake (29)

Review import eligibility and identity; restore valid records through intake, preserving identity.

| Legacy URL                                                                  | Record / identity                  | Evidence                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/law-enforcement-agency/al/reform-police-department-al-qyf3/`              | Reform Police Department           | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/antioch-police-department-ca-4ncy7/`            | Antioch Police Department          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/antioch-police-department-ca-hkqq/`             | Antioch Police Department          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/bart-police-department-ca-50kz/`                | Bart Police Department             | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/california-highway-patrol-ca-76k8/`             | California Highway Patrol          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/sacramento-police-department-ca-ejqg/`          | Sacramento Police Department       | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ca/torrance-police-department-ca-o71r/`            | Torrance Police Department         | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/co/aurora-police-department-co-9ewm/`              | Aurora Police Department           | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ct/new-haven-police-department-ct-hlfv/`           | New Haven Police Department        | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/fl/polk-county-sheriffs-office-fl-dy4b9/`          | Polk County Sheriff's Office       | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ga/atlanta-police-department-ga-o44v/`             | Atlanta Police Department          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ia/newton-police-department-ia-7g/`                | Newton Police Department           | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/il/chicago-police-department-il-073y/`             | Chicago Police Department          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/il/sangamon-county-sheriffs-office-il-1nsq/`       | Sangamon County Sheriff's Office   | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ky/louisville-metro-police-department-ky-0gks/`    | Louisville Metro Police Department | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/la/louisiana-state-police-la-7g/`                  | Louisiana State Police             | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/md/baltimore-police-department-md-zr7w/`           | Baltimore Police Department        | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/mi/grand-rapids-police-department-mi-mkf6/`        | Grand Rapids Police Department     | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ny/lloyd-police-department-ny-dbog/`               | Lloyd Police Department            | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ny/new-york-city-police-department-ny-hges/`       | New York City Police Department    | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/ny/rochester-police-department-ny-x7hw/`           | Rochester Police Department        | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/oh/adams-county-sheriffs-office-oh-a9xpv/`         | Adams County Sheriff's Office      | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/oh/akron-police-department-oh-7u4k/`               | Akron Police Department            | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/oh/cleveland-division-of-police-oh-ek9o/`          | Cleveland Division of Police       | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/oh/columbus-division-of-police-oh-ldvw/`           | Columbus Division of Police        | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/sc/north-charleston-police-department-sc-cfi9/`    | North Charleston Police Department | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/tn/memphis-police-department-tn-q7bd/`             | Memphis Police Department          | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/wa/pierce-county-sheriff-s-office-wa-cartermixon/` | Pierce County Sheriff's Office     | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |
| `/law-enforcement-agency/wa/tacoma-police-department-wa-cartermixon/`       | Tacoma Police Department           | Legacy manual agency without current source mapping; Legacy seed record omitted; some duplicate agencies already exist under feed IDs. Name similarity alone is not identity proof. |

### Personnel assigned only to excluded agency entries (15)

Decide whether to retain personnel independently of excluded assignments; investigate intake before declaring absent.

| Legacy URL                              | Record / identity    | Evidence                                                                                           |
| --------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `/personnel/brandon-tippie-67f1b7/`     | Brandon K Tippie     | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/ceasar-diaz-1025b7/`        | Ceasar L Diaz        | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/derek-reagan-e2bc87/`       | Derek J Reagan       | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/eric-rice-d8ed76/`          | Eric S Rice          | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/frank-garza-a4144f/`        | Frank Garza          | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/john-derichsweiler-d137a7/` | John A Derichsweiler | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/jon-mcconnell-8f45cc/`      | Jon K McCONNELL      | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/luis-serrano-2e40fc/`       | Luis A Serrano       | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/matthew-baker-6f94d5/`      | Matthew L Baker      | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/misty-tyler-475139/`        | Misty A Tyler        | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/nestor-chavez-iii-2a4100/`  | Nestor R Chavez      | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/scott-hefner-4eec90/`       | Scott A Hefner       | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/shawn-wilkerson-515bde/`    | Shawn L Wilkerson    | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/steven-morales-5f24b6/`     | Steven Morales       | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |
| `/personnel/terence-noah-c5628b/`       | Terence J Noah       | Legacy ID absent; legacy assignment points to DHS or out-of-state placeholder excluded from intake |

### Four personnel identity decisions (4)

Verify source identity against current candidates; merge/redirect only after confirmation.

| Legacy URL                         | Record / identity | Evidence                                 |
| ---------------------------------- | ----------------- | ---------------------------------------- |
| `/personnel/john-farmakes-k0l1m2/` | John Farmakes     | Legacy ID absent; manual legacy identity |
| `/personnel/mario-rojas-ea6bc4/`   | Mario Rojas       | Legacy ID absent; manual legacy identity |
| `/personnel/mark-hanneman-04hs/`   | Mark Hanneman     | Legacy ID absent; manual legacy identity |
| `/personnel/tou-thao-pqad/`        | Tou Thao          | Legacy ID absent; manual legacy identity |

### Two omitted reports (2)

Do not restore: user declined restoration on October 4; exact absence records added.

| Legacy URL                                                                           | Record / identity                                | Evidence                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------- |
| `/report/mn/2026-01-07-55401-death-of-renee-nicole-good-ice-shooting-d1e2f3/`        | Death of Renee Nicole Good - ICE shooting        | Legacy third-party review not restored |
| `/report/mn/2026-01-24-55404-death-of-alex-pretti-federal-officers-shooting-g4h5i6/` | Death of Alex Pretti - federal officers shooting | Legacy third-party review not restored |

### Verified federal headquarters redirects (4)

Redirect to the current headquarters record with the exact preserved production ID and slug; implemented.

| Legacy URL                              | Record / identity | Evidence                                                                                                                      |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/law-enforcement-agency/federal/cbp/`  | —                 | Fresh production-reference/current-ID comparison establishes the same headquarters entity; see source-trace correction below. |
| `/law-enforcement-agency/federal/tsa/`  | —                 | Fresh production-reference/current-ID comparison establishes the same headquarters entity; see source-trace correction below. |
| `/law-enforcement-agency/federal/uscg/` | —                 | Fresh production-reference/current-ID comparison establishes the same headquarters entity; see source-trace correction below. |
| `/law-enforcement-agency/federal/usms/` | —                 | Fresh production-reference/current-ID comparison establishes the same headquarters entity; see source-trace correction below. |

### Watch subroutes (2)

Preserve nested watch functionality. Removal approval is not established; do not substitute a redirect to the ordinary parent record.

| Legacy URL                                                                                              | Record / identity | Evidence                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------- |
| `/civil-litigation/tx/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/watch/{video link}/` | —                 | Parent report/case is retained; legacy watch route is not built |
| `/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/watch/{video link}/`               | —                 | Parent report/case is retained; legacy watch route is not built |
