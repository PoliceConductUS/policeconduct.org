## ADDED Requirements

### Requirement: Stored video relationship identity is preserved

The site SHALL generate watch pages for supported videos linked to reports and civil cases. Each watch URL SHALL use the existing canonical parent path followed by `watch/{stored-link-id}/`. Route rendering SHALL reload the parent by its exact stored slug, require the requested link ID to belong to that parent, and fail on a mismatched canonical path or missing link. Static path enumeration SHALL pass params only.

#### Scenario: Published watch page is restored

- **WHEN** an original video relationship exists on a report or civil case
- **THEN** its watch page embeds the source video and retains the original relationship ID
- **AND** it provides parent and source links and VideoObject metadata

#### Scenario: Requested link belongs to another record

- **WHEN** the requested video ID does not belong to the exact parent record or is not a supported video
- **THEN** rendering fails loudly

### Requirement: Legacy watch paths lead to corresponding videos

The redirect generator SHALL derive legacy report and civil-case watch redirects from stored parent slugs and link IDs. Existing approved report slug aliases MAY identify legacy parent paths. Redirects SHALL preserve the stored video ID and target the corresponding watch page.

#### Scenario: Existing parent slug alias has a video

- **WHEN** a legacy report slug alias resolves to a report containing a supported video
- **THEN** the old watch path redirects to the canonical report watch path with the same stored video ID
- **AND** it does not redirect to the ordinary report page or a replacement video ID
