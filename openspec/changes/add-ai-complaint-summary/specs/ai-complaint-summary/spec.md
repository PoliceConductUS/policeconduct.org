## ADDED Requirements

### Requirement: Provenance-bearing complaint summary

The system SHALL store AI complaint summaries independently of claims_summary and reject non-null summaries missing complaint URL, source page, filing date, retrieval timestamp, verified SHA-1, SHA-256, confidence, model, generation date, paragraph page support, limitations, or separately sourced procedural context.

#### Scenario: Incomplete provenance

- **WHEN** intake or website data access receives an incomplete summary
- **THEN** it fails visibly before persistence or rendering

#### Scenario: Source-bounded rendering

- **WHEN** a complete summary is loaded
- **THEN** the page displays an AI label, attributed complaint narrative and a compact complaint link; detailed metadata and procedural context remain internal

#### Scenario: No summary

- **WHEN** the summary field is null
- **THEN** an honest unavailable-summary message links to /donate/ and legacy claims_summary is not relabeled

### Requirement: Honest unavailable-summary states

The system SHALL distinguish confirmed missing complaint copies from retrieval, authentication, and generation failures and pending processing. Unassessed null metadata SHALL NOT imply a complaint copy is missing. Recorded unavailability SHALL include a reason, source URL, check timestamp, and internal detail. A completed summary and unavailability metadata SHALL NOT coexist.

#### Scenario: Confirmed missing copy

- **WHEN** sourced unavailability records a missing complaint copy
- **THEN** the page says we do not have a copy and links to /donate/ to support obtaining court records and making them available free on CourtListener, without promising this particular purchase

#### Scenario: Pending, failed, or unassessed

- **WHEN** no summary exists but the copy is not confirmed missing
- **THEN** the page states a complaint-based summary is not yet available without claiming the complaint is missing, and offers the same donation navigation

### Requirement: Direct summary opening

The page SHALL begin with the AI summary heading and attributed complaint narrative, without an additional introductory disclaimer.

#### Scenario: Reading a generated summary

- **WHEN** a sourced AI complaint summary renders
- **THEN** no introductory “The following summarizes” disclaimer appears before the narrative

### Requirement: Concise complaint presentation

The page SHALL omit disclaimer prose, retrieval/model/confidence details, page references, hashes and procedural-context sections. Full provenance and procedural records SHALL remain stored and validated internally.

#### Scenario: Opening a sourced summary

- **WHEN** the summary renders
- **THEN** readers see the narrative and a compact complaint link without the internal verification display

### Requirement: Consistent case section spacing

Case detail pages SHALL separate summary, personnel, agencies and related links with consistent section gaps and avoid doubled padding between header actions and facts.

#### Scenario: Reading a case with no summary

- **WHEN** the page displays the donation message and related entities
- **THEN** each content section has a visible gap before the next heading and the facts sit below the header without redundant top padding
