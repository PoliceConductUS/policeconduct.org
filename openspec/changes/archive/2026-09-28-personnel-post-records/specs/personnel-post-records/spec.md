## ADDED Requirements

### Requirement: Direct personnel discipline

Personnel profiles MUST show discipline identified by discipline.personnel_id exactly once per discipline record, independently of agency assignment links. The UI MUST retain all stored action/date/case/document/factual fields and authority, and any explicitly linked agencies. Optional fields MUST be omitted when absent. Dates MUST retain their recorded calendar day in all time zones.

#### Scenario: Discipline without agency links

- **WHEN** a person has a directly owned discipline record without assignment attribution
- **THEN** their profile shows the record and source without fabricating an agency

#### Scenario: Multiple linked agencies

- **WHEN** a discipline has multiple agency assignment links
- **THEN** one discipline record lists the linked agencies rather than duplicating the action

#### Scenario: Detailed source record

- **WHEN** stored allegations, findings, rule violations, chief actions or penalties exist
- **THEN** those distinct fields can be read through native disclosure and the supplied source link remains visible

### Requirement: Personnel education and training

Profiles MUST display education records directly owned by the person, with stored course name and supplied completion date, credits, sponsor and instructor. Zero credits MUST remain visible. Absent education MUST omit the section. Queries MUST NOT preload all education rows into memory.

#### Scenario: Education present

- **WHEN** the person has recorded courses
- **THEN** the section shows their courses newest dated first, undated last, with stable ordering

### Requirement: Compact course browsing

With JavaScript active, the education collection MUST show ten matches at a time with full-collection case-insensitive course/sponsor/instructor search, local Previous/Next buttons, result count, no-match state and clearing that returns to the first page. All records MUST remain accessible without JavaScript.

#### Scenario: Later course lookup

- **WHEN** a search matches a course outside the initial page
- **THEN** the matching course appears with its stored details

#### Scenario: No matching courses

- **WHEN** a search matches no records
- **THEN** a no-match message appears and clearing restores the first page
