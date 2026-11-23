## ADDED Requirements

### Requirement: robots.txt names the production sitemap

`npm run audit:seo` SHALL fail unless `robots.txt` has a `Sitemap:` line whose URL equals `https://www.policeconduct.org/sitemap-index.xml`, ignoring letter case in the whole URL. The audit runs locally against a completed build. No CI workflow runs it.

#### Scenario: Production sitemap is listed

- **WHEN** `robots.txt` has `Sitemap: https://www.policeconduct.org/sitemap-index.xml`, with LF or CRLF line endings and alongside other `Sitemap:` lines
- **THEN** the robots sitemap check passes

#### Scenario: Lookalike host is listed

- **WHEN** the only `Sitemap:` URL replaces the dots in the host, as in `https://wwwXpoliceconductYorg/sitemap-index.xml`
- **THEN** the robots sitemap check fails, so `npm run audit:seo` fails

#### Scenario: Longer host is listed

- **WHEN** the only `Sitemap:` URL is `https://www.policeconduct.org.example.com/sitemap-index.xml`
- **THEN** the robots sitemap check fails, so `npm run audit:seo` fails

#### Scenario: Label is missing

- **WHEN** `robots.txt` has the production sitemap URL on a line without a `Sitemap:` label
- **THEN** the robots sitemap check fails, so `npm run audit:seo` fails
