## ADDED Requirements

### Requirement: Personnel license records

Personnel profiles MUST list each license the person holds (`license` joined to `authority_license` and `licensing_authority`) as one card with its type from `authority_license.name`, its status, its first-awarded date when recorded, and its issuing authority linked to that authority's page on this site (`<state path>licensing-authority/`), as `state-licensing-authority` requires. Each card MUST have the fragment ID `license-{license.id}`. Absent licenses MUST omit the section.

#### Scenario: Several licenses

- **WHEN** a person holds licenses from one or more authorities
- **THEN** one card per license appears, each linking to its authority's page on this site

#### Scenario: No licenses

- **WHEN** a person holds no licenses
- **THEN** the profile has no license section

### Requirement: License type and role labels

The site MUST NOT rename license types; type cleanup belongs to intake, and the site only trims `authority_license.name`. Profiles MUST NOT label an assignment role (`agency_personnel.title`) as a license.

#### Scenario: Assignment role

- **WHEN** a profile shows a person's assignments
- **THEN** the assignment role appears under a "Role" label, separate from any license

### Requirement: License status display

The status display MUST merge values that differ only by letter case into one label. The status pill MUST use the green style only for "Active". Every other status MUST use the neutral status style that `DESIGN.md` defines.

#### Scenario: Status casing differs

- **WHEN** stored statuses are `ACTIVE` and `Active`
- **THEN** both show as "Active"

#### Scenario: Status is not Active

- **WHEN** a license status is "Inactive", "Expired", "Deceased" or any other value that is not "Active"
- **THEN** its status pill uses the neutral style, not the green style

### Requirement: License action timeline

Profiles MUST show every `license_action` across all of the person's licenses in one list, newest dated first and undated last, with stable order. Each entry MUST show its recorded action, the license type it belongs to, and its status when recorded. It MUST show the action date when one is recorded and omit it otherwise. The first 8 entries MUST be visible. The remaining entries MUST be inside a native, keyboard-operable disclosure.

#### Scenario: Long history

- **WHEN** a person has more than 8 license actions
- **THEN** the newest 8 are visible and opening the disclosure shows the rest in the same order

#### Scenario: Undated action

- **WHEN** an action has no recorded date
- **THEN** it appears after every dated action with no date shown

### Requirement: License action emphasis

The site MUST take the emphasis for each timeline entry from the explicit table of recorded license-action values that intake owns. The site MUST NOT keep its own list, patterns or rules for which actions to emphasize. An emphasized entry MUST show the visible text label "License Action", so the emphasis does not depend on color alone. A recorded action value that has no row in the intake table MUST fail the build.

#### Scenario: Emphasized action

- **WHEN** the intake table marks a recorded action value for emphasis
- **THEN** that timeline entry is emphasized and shows the text label "License Action"

#### Scenario: Unclassified action value

- **WHEN** a `license_action.action` value has no row in the intake table
- **THEN** the build fails and names the value

### Requirement: Discipline section anchor

Profiles with discipline MUST give the discipline section the fragment ID `discipline`.

#### Scenario: Roster count link target

- **WHEN** a person directly owns discipline records
- **THEN** their profile has an element with ID `discipline` that `/personnel/{stored-slug}/#discipline` reaches
