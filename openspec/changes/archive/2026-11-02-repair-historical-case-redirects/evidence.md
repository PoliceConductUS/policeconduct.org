# Retained identity and route evidence

Inspected November 2, 2026 UTC. This is retained-source verification; no new source acquisition or publication approval.

Historical evidence: `artifacts/ins109-reconciliation/historical-trace.json`, `raw-cases.json`, and `verification.json`; parent failure artifact: `artifacts/ins102-rebuild/six-case-route-check.json`. September 21 snapshot SHA-256: `294f0d77aa68aca68b4c79120505e39b6dd2ed5b252d6a00fc5d0ae5eabda247`.

The historical August 27 CourtListener artifact and September 21 database snapshot retain these exact old slugs. Website commit `c0d17dd^` implements `/civil-litigation/[category]/[slug]/`; `c0d17dd` migrates to `/civil-cases/[slug]/`. Retained incident geography supplies `mn` for the Minnesota case and `tx` for the five Texas cases. These are exact route-template forms, not evidence of traffic to every variant. No historical watch path is inferred.

| Old slug                                              | Retained canonical ID          | Current stored slug                                            |
| ----------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `wells-v-hanneman-mnd-0-23-cv-00273`                  | `idku3dncurohcol0mkwguljngats` | `locke-v-city-of-minneapolis-0-23-cv-00273-d-minn-2023`        |
| `grigoryan-v-wheeler-county-texas-txnd-2-25-cv-00276` | `mk8w2bhjx2vgcqgz6atdcb7z`     | `grigoryan-v-wheeler-county-texas-2-25-cv-00276-n-d-tex-2025`  |
| `young-v-the-city-of-irving-txnd-3-23-cv-01423`       | `uu32adr1xkzy24d0ty9g1md1`     | `young-v-city-of-irving-et-al-3-2023cv01423-n-d-tex-2023`      |
| `lotts-v-city-of-irving-txnd-3-25-cv-03329`           | `ogecfxi5p67286qbmvkfjoa4`     | `lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025` |
| `flash-v-jeff-davis-county-txwd-4-26-cv-00004`        | `vi7v2i5uvpqmfihrjggz25bo`     | `flash-v-jeff-davis-county-4-26-cv-00004-w-d-tex-2026`         |
| `roden-sr-v-reamer-txwd-5-26-cv-00081`                | `t5x7co7ggo1crdareyf5a2t9`     | `roden-sr-v-reamer-5-26-cv-00081-w-d-tex-2026`                 |

## Wells / Locke

The retained September 28 CourtListener response identifies docket `66785269`, court `mnd`, docket number `0:23-cv-00273`, filed February 2, 2023, and parties Karen Wells, Mark Hanneman, Andre Locke and City of Minneapolis. The August 27 transformed title is `Wells v. Hanneman`. Both CourtListener and Clearinghouse retained natural-key ledgers map `mnd:0:23-cv-00273` to `idku3dncurohcol0mkwguljngats`; INS-109 verified original and isolated ledger equality.

A fresh read-only query of the disposable database on November 2 found that same canonical ID, court and docket; title `Wells v. Hanneman`; primary source `https://www.courtlistener.com/docket/66785269/wells-v-hanneman/`; and stored slug `locke-v-city-of-minneapolis-0-23-cv-00273-d-minn-2023`. Thus the apparent title conflict is in the retained slug, not the current display title. The redirect preserves that slug and title. It does not assert that a court formally renamed the case, or match people by names.

## Slug history

The INS-109 follow-up recorded six explicit September 23, 2026 `cache set courtlistener CivilCase <case-key> slug <value>` commands whose values match the rebuilt slugs. This is a reported retained-command finding, not a new acquisition here. It establishes the override mechanism; its rationale and authorization were not established. This repair preserves those stored identities as required by INS-110 and restores old-route continuity without endorsing a title change.

## Limits

The same-case continuity proposition is supported by court/docket, retained ledgers, source locator and database identity. This does not verify substantive allegations, current procedural status, or authorize publication. Good/Pretti aliases and held submissions are outside this change. Missing identities remain subject to the unchanged prior-sitemap coverage gate.
