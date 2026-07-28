## ADDED Requirements

### Requirement: Report detail presentation

Experience-report detail pages SHALL render the approved editorial structure:
kicker, title, lede, fact-list, a factual "What happened" body, and an aside
explaining how reports work — built from the shared component library and
design tokens.

#### Scenario: Report detail page is rendered

- **WHEN** an approved experience report's detail page renders
- **THEN** the page uses the shared Breadcrumb, fact-list, and detail-layout
  structure styled with canonical tokens
- **AND** the factual account renders as the "What happened" body from the
  report's stored description

#### Scenario: Ratings are absent from report detail

- **WHEN** a report detail page renders for a report whose officers have
  rating data
- **THEN** the page does not render per-officer ratings or rating badges
- **AND** rating surfaces remain available on personnel and agency pages

### Requirement: Collection-to-display parity

Every field collected by the report submission flow SHALL have exactly one
codified disposition — displayed post-approval, internal-only, or
editor-added — and the detail page MUST NOT display a field that lacks a
verified storage path.

#### Scenario: Contextual facts render when present

- **WHEN** an approved report has stored values for incident time, interaction
  type, setting, purpose, complaint filed, case number, bodycam requested, or
  records requested
- **THEN** each present value renders as a fact-list row
- **AND** absent values render no row, placeholder, or fabricated content

#### Scenario: Submitted-by relationship renders

- **WHEN** an approved report has a stored submitter relationship
- **THEN** the fact-list shows a "Submitted by" row with the relationship
  wording (for example "Person directly involved")
- **AND** no reporter name, email, phone, or contact preference ever renders

#### Scenario: Editor-added charge outcome

- **WHEN** moderation or editorial review has recorded a charge outcome for a
  report
- **THEN** the fact-list shows the charge outcome
- **AND** the submission form does not collect charge outcomes (they are
  post-approval, editor-added data)

### Requirement: Labeled subjective section

When a report's submitter provided a "how it felt" account, the detail page
SHALL render it in a section visually and semantically separated from the
factual body and explicitly labeled as the submitter's subjective account.

#### Scenario: Feelings content renders labeled

- **WHEN** an approved report has stored feelings content
- **THEN** it renders in its own titled section, distinct from "What
  happened", with framing copy identifying it as the submitter's account of
  how the experience felt
- **AND** the page's aside copy explains the separation between factual
  observations and the labeled subjective account without hedging language

#### Scenario: No feelings content

- **WHEN** a report has no stored feelings content
- **THEN** the subjective section does not render at all
