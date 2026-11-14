# News between builds

## Design summary

Residents should see relevant source articles on the pages for the officers and agencies those articles concern. Intake discovers the articles. It can publish a release-specific update between builds and import that release's structured data for future ordinary builds. Forms also carry the identity of their originating build.

## Alternatives considered

Local database imports already support ordinary builds. They do not deliver a page update between builds. Publishing only HTML makes later import depend on scraping rendered pages. Editing the previous override makes its HTML the only record of earlier changes.

## Agreed approach

Save the data and template instructions for each changed page part. Apply the complete object to the original page for that release and publish the complete result. Intake later imports the structured article and placement records.

## Key decisions

Use an uncapped, resumable local browser sweep in agency source order and a separate visitor-driven Intake Action. The first qualifying article ends a targeted search, including a cached match. Update URL and paragraph evidence where needed. A preferred copy updates the same article ID. The same renderer can update any part of an original page.

## Open questions

The design distinguishes agreed behavior from proposed interfaces and remaining publication decisions. Implementation awaits design approval.
