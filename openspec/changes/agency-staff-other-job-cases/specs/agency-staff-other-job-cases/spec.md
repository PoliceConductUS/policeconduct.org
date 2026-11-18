## ADDED Requirements

### Requirement: Agency pages show cases from staff members' other jobs separately

An agency profile page SHALL show, in a section separate from the agency's own civil cases, the distinct civil cases that are tied through `public.civil_case_personnel` to an `agency_personnel` row at a different agency, for people who have at least one `agency_personnel` row (current or former) at this agency. A case that is linked to any `agency_personnel` row at this agency MUST NOT appear in this section.

#### Scenario: A staff member has a case from an earlier job

- **WHEN** a person currently assigned to Agency A has a civil case tied to their assignment at Agency B, and no assignment at Agency A is linked to that case
- **THEN** Agency A's page lists that case in the "Cases from staff members' other jobs" section
- **AND** Agency A's own civil-case list does not include it

#### Scenario: A case is also tied to this agency

- **WHEN** a civil case is linked both to an assignment at Agency A and to the same or another person's assignment at Agency B
- **THEN** the case appears only in Agency A's own civil-case list, not in the other-jobs section

### Requirement: The other-jobs count is separate from the agency's own count

The other-jobs section SHALL show its own count of distinct cases. The agency's own civil-case count, tile value and list MUST be unchanged by this section, and no page MUST show a number that adds the two counts together.

#### Scenario: Both counts on one agency page

- **WHEN** Agency A has 2 own cases and 3 cases from staff members' other jobs
- **THEN** the Civil Cases tile shows 2
- **AND** the other-jobs section states 3 cases
- **AND** the number 5 appears nowhere as a civil-case total for Agency A

### Requirement: Each other-jobs case appears once with every linked staff member

Each case in the other-jobs section SHALL appear on exactly one row. The row MUST list every person who has an assignment at this agency and is linked to the case through an assignment at another agency, each with the agency the case is tied to and whether the person is current or former staff at this agency. A person with any current assignment at this agency MUST be shown as current staff.

#### Scenario: Two staff members share one case

- **WHEN** two people who worked at Agency A are both linked to the same case through assignments at Agency B
- **THEN** the case appears once in Agency A's other-jobs section
- **AND** that row names both people, each "while at" Agency B

#### Scenario: The case agency has no page

- **WHEN** the agency a case is tied to has no agency page
- **THEN** that agency's name is shown without a link

### Requirement: Other-jobs rows are ordered by current staff first

Rows SHALL be ordered with rows that include at least one current staff member first, then rows with only former staff; within each group by filed date, newest first, then title.

#### Scenario: Mixed current and former rows

- **WHEN** Agency A has an other-jobs case linked only to a former staff member and an older case linked to a current staff member
- **THEN** the current staff member's case is listed first

### Requirement: Other-jobs labels describe the link without judgment

The section SHALL use the heading "Cases from staff members' other jobs" and a sentence stating that the cases are tied to a staff member's job at another agency, not to this agency. The section MUST NOT state or imply conduct, fault, accuracy or verification.

#### Scenario: Section copy

- **WHEN** the other-jobs section renders
- **THEN** it shows the heading and the explanation sentence
- **AND** no text in the section uses words that claim the records were verified or that the agency was a party

### Requirement: The agency civil-cases page includes the other-jobs list

The agency civil-cases page SHALL list the agency's own cases first and then the other-jobs cases in a separate table with its own heading, count and pagination using the civil-case page size. The page SHALL exist when either list has rows. Page N MUST show page N of each list, and a list with fewer pages MUST show no rows for that section on later pages. The render MUST reload the agency by route params and fail on a page number past the last page of both lists.

#### Scenario: Agency with only other-jobs cases

- **WHEN** Agency A has no own cases and 4 other-jobs cases
- **THEN** Agency A has a civil-cases page
- **AND** its own-cases section shows its empty state
- **AND** the other-jobs table lists the 4 cases

#### Scenario: Page past the end

- **WHEN** a request asks for a page number beyond the last page of both lists
- **THEN** no such page is built
