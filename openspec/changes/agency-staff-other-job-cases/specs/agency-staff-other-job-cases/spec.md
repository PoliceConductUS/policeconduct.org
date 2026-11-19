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

#### Scenario: Profile block with no other-jobs cases

- **WHEN** Agency A has 0 other-jobs cases
- **THEN** the profile shows no other-jobs block

#### Scenario: Profile block size

- **WHEN** Agency A has 1 or more other-jobs cases
- **THEN** the block shows at most 6 rows, the same limit as "Recent civil cases"
- **AND** below the rows a "View all cases from staff members' other jobs" link goes to the other-jobs section of the agency civil-cases page

### Requirement: The other-jobs count is separate from the agency's own count

The other-jobs section SHALL show its own count of distinct cases. The agency's own civil-case count, tile value and list MUST be unchanged by this section. Pages MUST NOT show a number that is the sum of the own count and the other-jobs count.

#### Scenario: Both counts on one agency page

- **WHEN** Agency A has 2 own cases and 3 cases from staff members' other jobs
- **THEN** the Civil Cases tile shows 2
- **AND** the other-jobs section states 3 cases
- **AND** the number 5 appears nowhere as a civil-case total for Agency A

### Requirement: Each other-jobs case appears once with every linked staff member

Each case in the other-jobs section SHALL appear on exactly one row. The row MUST list every person who has an assignment at this agency and is linked to the case through an assignment at another agency, each with every agency the case is tied to for that person (each person listed once).

#### Scenario: Two staff members share one case

- **WHEN** two people who worked at Agency A are both linked to the same case through assignments at Agency B
- **THEN** the case appears once in Agency A's other-jobs section
- **AND** that row names both people, each "while at" Agency B

#### Scenario: One person linked through two other agencies

- **WHEN** one person is linked to a case through assignments at Agency B and Agency C
- **THEN** the row names that person once, "while at" Agency B, Agency C

#### Scenario: The case agency has no page

- **WHEN** the agency a case is tied to has no agency page
- **THEN** that agency's name is shown without a link

### Requirement: Staff status follows the agency personnel list rule

Each person's status at this agency MUST come from the same rule the agency personnel list uses (`getAssignmentStatus`). A person is **current staff** when any of their assignments at this agency is current, otherwise **former staff** when any of their assignments at this agency has ended, otherwise their status is **unknown**. Current staff show "(current staff)", former staff show "(former staff)", and people with unknown status show no status text.

#### Scenario: Current and former assignments at this agency

- **WHEN** a person has one ended and one current assignment at Agency A
- **THEN** their name on the case row shows "(current staff)"

#### Scenario: Assignment dates do not support a status

- **WHEN** a person's only assignment at Agency A has a future start date or an unreadable end date
- **THEN** their name appears on the case row with no "(current staff)" or "(former staff)" text
- **AND** the row sorts with the rows that have no current staff member

### Requirement: Other-jobs rows are ordered by current staff first

Rows that include at least one current staff member SHALL come first; all other rows (former or unknown status only) follow; within each group by filed date, newest first, then title.

#### Scenario: Mixed current and former rows

- **WHEN** Agency A has an other-jobs case linked only to a former staff member and an older case linked to a current staff member
- **THEN** the current staff member's case is listed first

### Requirement: Other-jobs labels describe the link without judgment

The section SHALL use the heading "Cases from staff members' other jobs" and a sentence stating that the cases are tied to a staff member's job at another agency, not to this agency. The section's heading, explanation sentence and count text MUST NOT state or imply that the records were verified, confirmed or fact-checked, that they are accurate, that anyone was at fault or committed misconduct, or that this agency was a party to, a defendant in, or sued in the case.

#### Scenario: Section copy

- **WHEN** the other-jobs section renders
- **THEN** it shows the heading and the explanation sentence
- **AND** the heading, explanation sentence and count text contain none of the claims listed in this requirement

### Requirement: The agency civil-cases page includes the other-jobs list

The agency civil-cases page SHALL list the agency's own cases first, under the heading "Cases tied to this agency's personnel records", and then the other-jobs cases in a separate table with its own heading and count, using the civil-case page size. The page SHALL exist when either list has rows. The other-jobs section SHALL carry an in-page anchor that the profile's "View all" link targets.

#### Scenario: Agency with only other-jobs cases

- **WHEN** Agency A has no own cases and 4 other-jobs cases
- **THEN** Agency A has a civil-cases page
- **AND** the page states "0 civil cases tied to this agency's personnel records."
- **AND** no own-cases table is shown
- **AND** the other-jobs table lists the 4 cases

### Requirement: One page control serves both civil-case lists

The agency civil-cases page SHALL use one page control for both lists: page N shows page N of each list. The render MUST reload the agency by route params and fail on a page number past the last page of both lists.

#### Scenario: Page with rows in only one list

- **WHEN** Agency A has rows in both lists, and on page N one list has rows and the other has already ended
- **THEN** the list that ended shows its heading and the line "No more cases in this list." with no table
- **AND** the other list shows its rows for page N

#### Scenario: Page past the end

- **WHEN** a request asks for a page number beyond the last page of both lists
- **THEN** no such page is built
