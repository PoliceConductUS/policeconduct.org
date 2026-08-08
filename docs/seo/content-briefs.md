# SEO Content Briefs — State Index Enrichment & Explainers

**Created:** 2026-08-08
**Context:** Output of the SEO audit (`docs/seo/audit-2026-08.md`). These briefs target the
biggest content gap identified: informational / "how-do-I" demand that competitors
(NACDL, MuckRock, WNYC) currently own, plus the state-level and civil-settlement angles
where PoliceConduct.org's nationwide data is a structural advantage.

**How to use:** Each brief is self-contained — hand one to a writer. Difficulty and
volume are directional (no keyword tool connected). Every article should emit
`NewsArticle`/`Article` schema (builder now exists: `buildNewsArticle` in
`src/lib/structured-data.js`) and reinforce the citation context already published in
`/llms.txt` (a listing is not an accusation; pending ≠ finding; dismissal is an outcome).

**Positioning note (read first):** PoliceConduct.org is **not** a "misconduct database." It
is the public record of **police conduct — all of it: good, bad, and everywhere in
between** (harm and concern _and_ professionalism, help, trust, and commendations). That
mission must govern our own titles, H1s, meta descriptions, and body voice: never brand
the site or a page as misconduct-only. The word "misconduct" still appears below in
**keyword** fields — that's demand-side (it is how the public searches, and we legitimately
rank because misconduct records are _part of_ the full conduct record). Keep the search
term in targeting; keep it out of our self-description.

---

## Brief 1 — Enrich the existing State Index page (`/[state]/`)

> **This page already exists** as the state index (`/tx/`, `/nc/`, … — e.g. "Texas Civic
> Index", already emitting `CollectionPage` + `BreadcrumbList` and already framed
> conduct-neutrally). **Do not build a new pillar or a `/[state]/police-misconduct-records/`
> URL.** This brief adds a short state-specific editorial layer + optional schema to the
> page that's already there.

- **Type:** Editorial + schema enrichment of the existing state index template (`CivicIndexPage`), one lede per state/territory + DC
- **Primary keyword:** `police records [state]`, `[state] police disciplinary records` — plus the search-demand term `police misconduct records [state]` (we rank because those records are part of the full conduct record)
- **Secondary:** `[state] POST decertification`, `is police misconduct public in [state]`, `[state] police officer license lookup`, `[state] police complaints`
- **Intent:** Commercial + informational
- **Priority:** High · **Effort:** Moderate — the page, route, and schema already exist; this is an editorial lede + optional FAQ block, **not** a new build
- **Why it matters:** The state index already ranks structurally; a short state-specific editorial lede (disclosure law, how to read the record, the all-conduct scope) captures the informational queries WNYC/MuckRock own — with no new URL and no cannibalization.
- **Target page:** existing state index `/[state]/` (e.g. `/tx/`). Keep the URL as-is.
- **Title tag (≤60):** keep the existing conduct-neutral pattern — `[State] Civic Index | PoliceConduct.org` (optionally broaden to `[State] Police Records: Agencies, Personnel & Cases | PoliceConduct.org`). **Do not** retitle to "misconduct."
- **Meta description (≤160):** refine the existing neutral one, e.g. `The public record of police conduct in [State] — agencies, personnel, experience reports, and civil cases. Good, bad, and everywhere in between.`
- **H1:** keep `[State]` (existing) + an editorial sub-lede. Don't rename the H1 to "misconduct."
- **Editorial lede to ADD (H2s):**
  1. What police records are public in [State] (disclosure-law summary)
  2. How to request records (POST board, agency, court dockets)
  3. What you'll find here: agencies, personnel, experience reports (positive _and_ negative), civil cases
  4. How to read the record (a listing is not an accusation; pending ≠ finding; commendations count too)
- **Internal links:** county/place children (already linked), civil-cases index, `/data-and-methods/`, `/frequently-asked-questions/`
- **Schema:** already emits `CollectionPage` + `BreadcrumbList`; optionally add a state-scoped `FAQPage` for the disclosure-law Q&As (reuse the FAQ builder pattern)
- **CTA:** existing search/browse + "Report an interaction — good or bad" → `/report/new/`
- **GEO note:** the state index is the natural citation target for "police records in [State]." Lead the new lede with a crisp, quotable 2–3 sentence answer that names the **all-conduct** scope (not just misconduct).

---

## Brief 2 — Explainer: "How to Look Up a Police Officer by Name"

- **Type:** Evergreen explainer article
- **Primary keyword:** `look up police officer by name`, `search police officer misconduct history`
- **Secondary:** `how to find out if a police officer has complaints`, `police officer background lookup`
- **Intent:** Transactional / informational (high intent)
- **Priority:** High · **Effort:** Moderate (half day)
- **Why it matters:** Directly maps to a top People-Also-Ask cluster; funnels straight into personnel pages, your per-name long-tail strength.
- **Recommended URL:** `/news/` article or a `/guides/how-to-look-up-a-police-officer/`
- **Title tag (≤60):** `How to Look Up a Police Officer by Name | PoliceConduct.org`
- **Meta description (≤160):** `A step-by-step guide to a police officer's agency history, conduct record, and lawsuits — using public licensing, court, and agency records.`
- **H1:** `How to Look Up a Police Officer by Name`
- **Outline (H2s):**
  1. Start with state licensing (POST) data — what it shows
  2. Search court dockets for civil lawsuits (PACER + our civil-cases)
  3. Check agency and oversight-board records
  4. What our personnel pages pull together
  5. Limits: what a record does and doesn't mean
- **Internal links:** `/personnel/`, `/find-records/`, civil-cases index, `/data-and-methods/`
- **Schema:** `Article` (+ consider `HowTo` for the step list) + `BreadcrumbList`
- **CTA:** "Search personnel records" → `/personnel/`
- **GEO note:** Structure the steps as a clean ordered list; AI engines extract these into answers verbatim.

---

## Brief 3 — Explainer: "What a Dismissed Case Means (and What It Doesn't)"

- **Type:** Evergreen explainer (also strengthens interpretive/E-E-A-T signals sitewide)
- **Primary keyword:** `what does a dismissed case mean`, `dismissed police complaint meaning`
- **Secondary:** `pending vs dismissed case`, `does dismissed mean innocent`
- **Intent:** Informational
- **Priority:** Medium-High · **Effort:** Quick–Moderate
- **Why it matters:** Reinforces the exact citation nuances in `/llms.txt`, reducing the risk of AI engines mis-summarizing your listings as accusations. It's defensive SEO/GEO and topical-authority building at once.
- **Recommended URL:** `/frequently-asked-questions/` deep-link or `/guides/reading-the-record/`
- **Title tag (≤60):** `What a Dismissed Case Means — and What It Doesn't`
- **Meta description (≤160):** `A dismissal is a court outcome, not a finding of innocence — and a listing is never an accusation. How to read case status on PoliceConduct.org.`
- **H1:** `What a Dismissed Case Means (and What It Doesn't)`
- **Outline (H2s):** pending = allegation; dismissal = outcome, not exoneration; settlement ≠ admission; a personnel listing is employment history; how we label status
- **Internal links:** `/frequently-asked-questions/`, `/data-and-methods/`, civil-cases index, `/legal-notice/`
- **Schema:** `Article` + `BreadcrumbList` (mirror key Q&As into the existing `FAQPage`)
- **GEO note:** This is the canonical "citation context" page — link to it from `/llms.txt` and from every entity page's methodology footer if feasible.

---

## Brief 4 — Explainer: "How to Find Police Records: A Step-by-Step Guide"

- **Type:** Comprehensive evergreen guide (hub for the explainers above)
- **Primary keyword (search demand):** `how to find police misconduct records`, `how to access police records` — targeted in the body/H2s; our title stays conduct-neutral (see Positioning note)
- **Secondary:** `police records database`, `public records police complaints`, `police conduct records`
- **Intent:** Informational (broad, high-volume)
- **Priority:** High · **Effort:** Moderate–Substantial
- **Why it matters:** Head-of-cluster informational term that MuckRock/NACDL rank for; anchors internal links to the state index pages and the two explainers, building a topic cluster.
- **Recommended URL:** `/guides/how-to-find-police-records/`
- **Title tag (≤60):** `How to Find Police Records: Conduct, Complaints & Cases`
- **Meta description (≤160):** `Where U.S. police records live — licensing boards, court dockets, and agency files — and how to search an officer's full conduct record fast.`
- **H1:** `How to Find Police Records: Conduct, Complaints, and Court Cases`
- **Outline (H2s):** the five record sources; how disclosure varies by state (link to state index pages); searching by officer, by agency, by city; free tools & databases (honest comparison); how PoliceConduct.org fits — the full conduct record, not just complaints
- **Internal links:** state index pages (Brief 1), Briefs 2 & 3, `/find-records/`, `/data-and-methods/`
- **Schema:** `Article` + `HowTo` + `BreadcrumbList`
- **CTA:** "Start your search" → `/find-records/`

---

## Brief 5 — Angle: "[Agency] Lawsuit Settlements: What the Civil Record Shows"

- **Type:** Editorial template layered onto agency/liability pages (or standalone for large agencies)
- **Primary keyword:** `[agency] lawsuit settlements`, `[city] police settlements`, `police settlement [city]`
- **Secondary:** `[agency] civil lawsuits`, `how much [city] pays police lawsuits`
- **Intent:** Commercial / news
- **Priority:** High · **Effort:** Moderate
- **Why it matters:** The **single strongest differentiator** — no competitor links civil litigation → agency → officer the way you can. High-newsworthiness, link-attracting, and underserved.
- **Recommended URL:** existing agency `.../liability-costs/` or `.../civil-cases/` pages, enriched with an editorial summary block
- **Title tag (≤60):** `[Agency] Lawsuit Settlements & Civil Cases | PoliceConduct.org`
- **Meta description (≤160):** `Civil lawsuits and settlements involving [Agency] — cause numbers, courts, filing dates, and outcomes, linked to the officers and reports on record.`
- **H1:** `[Agency] Lawsuit Settlements and Civil Cases`
- **Outline (H2s):** total tracked cases & known outcomes; notable cases; how settlements are recorded (not an admission); officers named across cases; sources & methodology
- **Internal links:** agency detail, personnel of that agency, civil-cases index, `/data-and-methods/`
- **Schema:** `CollectionPage` + `ItemList` of `LegalCase` + `BreadcrumbList`
- **GEO note:** Surface a one-line factual summary ("As of [date], N civil cases are on record involving [Agency]") that engines can quote with the `dateModified`.

---

## Suggested publishing order

1. **Brief 3** (dismissed/pending) — quick, defensive, links from `/llms.txt`.
2. **Brief 2** (look up an officer) — high intent, funnels to personnel.
3. **Brief 4** (how-to hub) — anchors the cluster.
4. **Brief 1** (state index enrichment) — roll the editorial lede out to highest-population / highest-disclosure states first.
5. **Brief 5** (agency settlements) — start with the largest agencies by case count.
