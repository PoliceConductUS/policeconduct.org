## ADDED Requirements

### Requirement: Personnel license records

Personnel profiles MUST list each license the person holds (`license` joined to `authority_license` and `licensing_authority`) as one card with its type from `authority_license.name`, its status and its first-awarded date when recorded. Each card MUST have the fragment ID `license-{license.id}`. Absent licenses MUST omit the section.

#### Scenario: Several licenses

- **WHEN** a person holds licenses from one or more authorities
- **THEN** one card per license appears, each linking to its authority's page on this site

#### Scenario: No licenses

- **WHEN** a person holds no licenses
- **THEN** the profile has no license section

### Requirement: License issuing authority

When a license's type has a recorded licensing authority, the card MUST show it linked to that authority's page on this site (`<state path>licensing-authority/`), as `state-licensing-authority` requires. A license with no recorded authority MUST omit "Issued by".

#### Scenario: Recorded authority

- **WHEN** a license's type has a recorded licensing authority
- **THEN** its card links to that authority's page on this site

#### Scenario: No recorded authority

- **WHEN** a license's type has no recorded licensing authority
- **THEN** its card shows no "Issued by" line

### Requirement: License type and role labels

License types MUST show `authority_license.name` as stored; type cleanup belongs to intake. Profiles MUST NOT label an assignment role (`agency_personnel.title`) as a license.

#### Scenario: Assignment role

- **WHEN** a profile shows a person's assignments
- **THEN** the assignment role appears under a "Role" label, separate from any license

### Requirement: License status display

License status MUST show `license.status` as stored, with no change to case, spacing or spelling; status cleanup belongs to intake. A license with no stored status MUST omit the status and the pill. The status pill MUST use the neutral status style that `DESIGN.md` defines, except that it MUST use the green active style when a stored intake fact marks the status as active. The site MUST NOT decide which status values are active.

#### Scenario: Status shows as stored

- **WHEN** a license's stored status is `ACTIVE`
- **THEN** the card shows `ACTIVE`

#### Scenario: Status not marked active

- **WHEN** intake does not mark a license's status as active, or intake does not yet store that fact
- **THEN** its status pill uses the neutral style

#### Scenario: Status marked active

- **WHEN** intake marks a license's status as active
- **THEN** its status pill uses the green active style

#### Scenario: No stored status

- **WHEN** a license has no stored status
- **THEN** the card shows no status and no pill

### Requirement: License action timeline

Profiles MUST show every `license_action` across all of the person's licenses in one list, newest dated first and undated last, with ties broken by `license_action.id`. Each entry MUST show its recorded action, the license type it belongs to, and its status when recorded. It MUST show the action date when one is recorded and omit it otherwise. The first 8 entries MUST be visible. The remaining entries MUST be inside a native, keyboard-operable disclosure.

#### Scenario: Long history

- **WHEN** a person has more than 8 license actions
- **THEN** the newest 8 are visible and opening the disclosure shows the rest in the same order

#### Scenario: Undated action

- **WHEN** an action has no recorded date
- **THEN** it appears after every dated action with no date shown

### Requirement: License action type

Each timeline entry MUST show, under the visible text label "License Action", the name and category of its action type as stored (`license_action_type.name` and `license_action_type.category`), reached through the foreign key `license_action.license_action_type_id` that intake records. The site MUST NOT match action text. Until intake records the action type, entries show the recorded action only.

#### Scenario: Type recorded

- **WHEN** a timeline entry's action has a recorded action type
- **THEN** the entry shows the type name and category under "License Action"

#### Scenario: Action type not yet recorded

- **WHEN** the database does not yet hold `license_action.license_action_type_id`
- **THEN** no "License Action" label appears

### Requirement: License action emphasis

A timeline entry's style MUST follow its stored action-type category, and only the `discipline` category is emphasized; the visible category text means the emphasis does not depend on color alone. The site MUST NOT keep its own list, patterns or rules for which actions to emphasize. Until intake records the action type, no entry is emphasized.

#### Scenario: Discipline category

- **WHEN** a timeline entry's action type has category `discipline`
- **THEN** the entry is emphasized

#### Scenario: Other category

- **WHEN** a timeline entry's action type has a category other than `discipline`
- **THEN** the entry has no emphasis

### Requirement: Discipline section anchor

Profiles with discipline MUST give the discipline section the fragment ID `discipline`.

#### Scenario: Roster count link target

- **WHEN** a person directly owns discipline records
- **THEN** their profile has an element with ID `discipline` that `/personnel/{stored-slug}/#discipline` reaches
