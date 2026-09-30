# Reset database coverage audit

Live inventory on 2026-09-30 before the new coverage changes. Counts identify records, not safety, performance, or distinct incidents across linked personnel. Final generated-artifact verification is pending. Read-only audit reports are retained with the working execution ledger; this file is the consolidated repository record.

| Public table                   | Source rows | Visitor use / required work                                                                                                                                                                             |
| ------------------------------ | ----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| agency                         |       3,300 | Canonical agency contact/status pages and geographic directories; remove eligibility filter excluding 93 valid agencies.                                                                                |
| agency_personnel               |     181,686 | Complete assignment histories and agency rosters; expose exact assignment-license link.                                                                                                                 |
| agency_phone_numbers           |       5,449 | Agency phone links and descriptions; all agencies must have a page.                                                                                                                                     |
| agency_zip_index               |  0 at reset | Derived office-postcode index rebuilt with projections; office ZIP is already on agency pages. This is not a service-area table.                                                                        |
| arrest_profile                 |         320 | Add all assignment-linked profiles with source, recorded months, totals and all seven count/share distributions.                                                                                        |
| authority_license              |          14 | License names/types tied to issuing authority on personnel pages.                                                                                                                                       |
| build_page_payload             |  0 at reset | Rebuilt canonical entity/location projections support site navigation and summaries. Hashes/build timestamps stay internal.                                                                             |
| civil_case_links               |         465 | Case source/evidence links.                                                                                                                                                                             |
| civil_case_personnel           |       1,040 | Linked people/agencies on case pages and case lists on their profiles.                                                                                                                                  |
| civil_cases                    |         465 | All case pages show title, court, case number, filed date, claims, sources and linked people; add 244 stored closing dates and explicitly labeled incident location.                                    |
| coverage_link_agency_personnel |           0 | Connects source articles to exact personnel assignments; render through personnel/agency source sections when present.                                                                                  |
| coverage_links                 |           0 | Add visible title/source/date/notes display to existing loaders; currently no article records.                                                                                                          |
| data_mutation_applied          |           8 | Internal version/checksum bookkeeping, not public civic content.                                                                                                                                        |
| discipline                     |          76 | Complete recorded actions, dates, allegations, findings, sanctions, authority and documents already render on personnel pages.                                                                          |
| discipline_agency_personnel    |           0 | Explicit attribution of discipline to assignments; existing loader supports it. No attribution inferred when absent.                                                                                    |
| federal_agency                 |          11 | Federal directory, parent pages and branch links through agency.parent_federal_agency_id.                                                                                                               |
| license                        |     163,805 | All license types/status/awarded dates/authority links on personnel pages.                                                                                                                              |
| license_action                 |     188,003 | Full dated timeline in HTML; details expands beyond initial eight entries.                                                                                                                              |
| licensing_authority            |          50 | State authority pages/links and license/discipline attribution.                                                                                                                                         |
| location_path                  |      60,320 | Exact canonical paths, display names and ancestry for represented records. Empty areas need not produce empty police-record pages.                                                                      |
| location_path_alias            |       1,484 | Alternative geographic resolution keys; currently no public consumer. Alias semantics do not establish prior public URLs, so not blindly emitted as redirects.                                          |
| location_path_closure          |  0 at reset | Rebuilt ancestry relation supports geographic record scoping; rows are not independent visitor content.                                                                                                 |
| location_path_geometry         |      60,287 | Geographic boundary infrastructure; current record pages do not display these polygons. Boundary-map UI would be a separate surface; do not dump polygon coordinates or imply agency service territory. |
| personnel                      |     140,552 | Every person has an assignment and is generated; include 115,693 stored middle names, suffix/prefix and optional death sources.                                                                         |
| personnel_education            |   1,769,990 | All courses, completion dates, credits, sponsor and instructor in generated HTML; client search/pagination preserves full records.                                                                      |
| review_links                   |          10 | All report evidence/source links.                                                                                                                                                                       |
| review_personnel               |           5 | Report-personnel-agency relationships. Ratings intentionally suppressed by approved report-pages spec; do not reverse that policy.                                                                      |
| reviews                        |           3 | Authored description, context, people and evidence; add desired outcomes (all three), correct how_felt and present narrative facts. Reporter identity remains internal.                                 |
| spatial_ref_sys                |       8,500 | PostGIS coordinate-system metadata, internal infrastructure.                                                                                                                                            |

## Interpretation and field exclusions

Internal IDs join records and are not displayed as public labels; slugs provide canonical URLs. Write-audit metadata and technical duplicate columns are not duplicated as visitor facts. Source update dates appear only when known. Direct counts do not establish quality or causal conclusions.

Arrest source contains single-dimensional counts only. All seven distributions reconcile to each profile total. District codes have no provided geography meaning. There are no raw arrest IDs or joint distributions to establish unique agency totals, residence/arrest geography, or cross-filtered comparisons. Display exact recorded categories and time periods, with percentage denominator shown, rather than invent those facts.

The named geometry/alias tables are recorded exceptions, not claimed page coverage. All substantive police records have a visitor surface after the planned changes. Generated output evidence below must verify that statement before release completion.

## Verification evidence

- Schema baseline: 25 required tables pass; no agency references a non-place.
- Every personnel row has an assignment (0 excluded by profile enumeration). Every assignment license belongs to that same person (0 mismatches).
- Initial projections: 3,207 agency pages, 1,687 location pages, 3 report summaries; 93 excluded agencies require task 2.
- Baseline aggregate validate: exit 0, 117 browser tests passed, 7 existing skips. Six report tests skip because fixture queries reference retired tables; task 2 will migrate them. Search test requires the built Pagefind index and will run against generated output.
- Final generation, page checks and preview evidence pending.
