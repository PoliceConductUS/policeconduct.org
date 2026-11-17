# Production personnel URL reconciliation — September 20, 2026

Production sitemap captured at `2026-09-21T02:21:07.830Z` from https://www.policeconduct.org/sitemap-index.xml.

## Result

| Category                                                                  |    URLs |
| ------------------------------------------------------------------------- | ------: |
| Published individual personnel profiles                                   | 130,039 |
| Same database ID, different current slug                                  | 129,924 |
| Legacy identity absent; no verified replacement identified                |     105 |
| Legacy identity absent; plausible replacement candidate needs review      |      10 |
| Personnel collection, state, and pagination URLs (separate from profiles) |   2,070 |

The current database contains 140,563 personnel, all linked to agency assignments.
Every published individual profile slug differs from the current slug or is absent.
The 129,924 exact-ID matches must not be classified as intake absences.

`route-absences.json` now accounts for the 105 remaining gaps as normal 404s with
no scheduled return. It makes no permanent-removal claim. Twenty-one of those
105 have same-name candidates in different agencies/states; these were not treated
as verified replacements. The remaining ten are excluded from the absence list
pending identity review.

## Evidence and method

- Prior URLs: captured production sitemap, not an old local build.
- Legacy identity: `officers.csv` and `agency_officers.csv` from the existing
  intake reference backup `intake-workspace/dev/backups/reference-20260814/`.
- Current identity: read-only query of `public.personnel` joined to
  `public.agency_personnel`, using the same inclusion rule as the profile page.
- Replacement matches use exact persisted database IDs, not names or derived slugs.
- For missing IDs, first/last-name candidates were reviewed against current and
  legacy agency assignments. Names alone did not establish identity.
- The 52 unmatched one-segment paths are state/federal collection URLs, not people.

Local capture and full crosswalk files are in `.cache/route-reconciliation/`
(ignored working evidence, not production redirect configuration):

| Evidence                        | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `sitemap-index.xml`             | `4ec637712c6906a5f80267003bcaf09fb7cb6dcd18af15bf01d7db80ab40ddf3` |
| `production-paths.json`         | `a55431fe2f29a998220d4284c623051740453724443dd524b0e361edf36b4edd` |
| `current-personnel.json`        | `218ba77dfefdc957fd3f7201b0aa02edd2e2f3bc71af00d3ded0da601f3ed24a` |
| `personnel-slug-changes.csv`    | `47d7f9e3ab52374575a23d165b8920ee7ede2286b1dd35a82e0ebea188a7d9e2` |
| `personnel-identity-review.csv` | `0562516ac72f672fcafb7cdaa39942bad29476b051356e67a398aad7235228ab` |
| `officers.csv`                  | `cf1fffeee4bcb5ed2fc1293af7229d84f8808f6ea00a2893d4c8d0d5addbacca` |
| `agency_officers.csv`           | `1698df07c81a2f5e0e773c6c1ca622730f82ed0ef39f36c83df44ce32a6bc5da` |

## Unresolved replacement identities

These profiles have plausible current records at the same agencies (including a
spelling-variant candidate), but lack a
verified identifier crosswalk. Similar names and assignments are evidence for
review, not automatic redirect authorization.

| Prior path                          | Current candidate                  |
| ----------------------------------- | ---------------------------------- |
| `/personnel/chris-true-6639a9/`     | `/personnel/chris-true-3ttvba/`    |
| `/personnel/dowell-true-jr-c6a02b/` | `/personnel/dowell-true-hsws0p/`   |
| `/personnel/john-farmakes-k0l1m2/`  | `/personnel/john-farmakes-l2v4t3/` |
| `/personnel/mario-rojas-ea6bc4/`    | `/personnel/mario-rojas-rftky3/`   |
| `/personnel/mark-hanneman-04hs/`    | `/personnel/mark-hanneman-dy08q0/` |
| `/personnel/patrick-true-a21229/`   | `/personnel/patrick-true-upy206/`  |
| `/personnel/tou-thao-pqad/`         | `/personnel/tou-thao-4gyya3/`      |
| `/personnel/trevor-true-7a9d94/`    | `/personnel/trevor-true-mtk7h6/`   |
| `/personnel/true-miller-29bb24/`    | `/personnel/true-miller-duwcba/`   |

## Correction and original state breakdown

Follow-up review found that the legacy Spenser Stockwell profile has a plausible
Spencer Paul Stockwell match at Minnesota State Patrol. The exact first/last-name
comparison missed this spelling difference. The old URL was removed from the 404
list and added to identity review: `/personnel/spenser-stockwell-h7i8j9/` → candidate
`/personnel/spencer-stockwell-fssojg/`. Current personnel ID:
`i74ss56e0bo9ia76fgfssojg`. No identity merge has been applied.

The original 106 count was preliminary unmatched URL records, not proof that 106
people are absent. Two are “Unknown Personnel” records. The original breakdown
below uses legacy agency state, not incident location or residence. Each profile
has exactly one state in this comparison. The two D.C. records belong to ICE and
are federal agency records. Minnesota now has five remaining 404 entries; the
total list is 105. Other spelling or name variants have not been comprehensively
excluded.

| Legacy agency state                | Original missing-profile URLs |
| ---------------------------------- | ----------------------------: |
| California                         |                            24 |
| New York                           |                            11 |
| Ohio                               |                            10 |
| Texas                              |                             9 |
| Washington                         |                             8 |
| Maryland                           |                             6 |
| Minnesota                          |                             6 |
| Connecticut                        |                             5 |
| Tennessee                          |                             5 |
| Colorado                           |                             3 |
| Florida                            |                             3 |
| Kentucky                           |                             3 |
| Alabama                            |                             2 |
| District of Columbia (federal/ICE) |                             2 |
| Iowa                               |                             2 |
| Illinois                           |                             2 |
| Louisiana                          |                             2 |
| Georgia                            |                             1 |
| Michigan                           |                             1 |
| South Carolina                     |                             1 |
| Total                              |                           106 |

## Release decisions still open

Preserving the published slugs in intake versus adding bulk redirects requires a
decision. The 129,924 exact-ID redirects need at least 9,666,571 bytes of keys and
values for one preview namespace. This exceeds the current CloudFront KeyValueStore
[5 MB limit](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-create-s3-kvp.html).
No redirect infrastructure or intake data was changed.

This is a personnel identity inventory, not a successful whole-site release
coverage check. Agency/report/case URLs and personnel collection routes still need
comparison against the completed fresh build. The old local sitemap was not used
to certify the next release.

The full rebuild was stopped while the bulk slug decision is pending. Its
partial `dist/` output must not be deployed. After the decision is implemented,
run a complete build and the whole-site coverage check.
