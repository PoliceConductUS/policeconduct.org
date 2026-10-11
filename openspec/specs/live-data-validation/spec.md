# live-data-validation Specification

## Purpose

TBD - created by archiving change align-validation-with-live-data. Update Purpose after archive.

## Requirements

### Requirement: Browser validation uses current data

Browser tests SHALL compare mutable record counts and prefill source text to current database fixtures while retaining exact page, navigation, and form assertions.

#### Scenario: Database content changes

- **WHEN** counts, civil-case text, or agency location display names change
- **THEN** browser tests assert the current source values instead of a previous snapshot

#### Scenario: Required fixture is absent

- **WHEN** a required fixture path or source record cannot be loaded
- **THEN** its test fails rather than skipping

### Requirement: Optional location context follows its source

Civic-page tests SHALL assert the presence and content of supplied licensing/decertification reports and the absence of their panels when no such records are attached to that location.

#### Scenario: No attached location reports

- **WHEN** the location payload contains no licensing or decertification reports
- **THEN** its browser test asserts that neither panel renders

### Requirement: Map navigation uses a stable pointer target

The generic state-navigation browser test SHALL use a named populated full-size state and perform a real mouse click, without force clicking or dispatching a synthetic event.

#### Scenario: A small region appears first

- **WHEN** the first populated map region is D.C.
- **THEN** the generic navigation test still clicks its named Texas target and verifies navigation to the target's records URL
