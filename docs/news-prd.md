# News coverage

News coverage is a news story linked to an officer at an agency. An officer-name and agency match is sufficient to make that connection; no additional approval step is required.

## Stored records

- `public.coverage_links` stores the news link, title, source name, publication date, and notes.
- `public.coverage_link_agency_personnel` connects the link to `public.agency_personnel`, the officer's assignment at an agency.
- The assignment connects the coverage to the officer's personnel record and agency.

Intake supplies these records. The website reads them from the configured local database.

## Display

`src/lib/data/coverage.ts` loads the links for agency and personnel pages. Agency pages select links through assignments at that agency; personnel pages select links through that person's assignments.

Links are sorted by publication date descending, then title and ID. Missing publication dates sort last.

`src/components/CoverageLinks.astro` displays the title as a link to the news source, with the source name, publication date, notes, and linked officers where present. The section is omitted when there are no links.
