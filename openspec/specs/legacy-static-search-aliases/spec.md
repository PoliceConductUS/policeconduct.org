# legacy-static-search-aliases Specification

## Purpose

Preserve exact redirects for the verified legacy privacy and prosecutor URLs with and without trailing slashes.

## Requirements

### Requirement: Verified legacy static aliases preserve exact slash variants

The generated redirect inventory SHALL contain exactly one 301 entry for each of /privacy-policy and /privacy-policy/ to /legal-notice/privacy/, and /partner/prosecutor and /partner/prosecutor/ to /partner/.

#### Scenario: A legacy request omits its trailing slash

- **WHEN** the redirect inventory is generated
- **THEN** both no-slash source keys appear unchanged with their specified targets
- **AND** the existing trailing-slash source keys remain present once
