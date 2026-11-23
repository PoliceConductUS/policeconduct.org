## MODIFIED Requirements

### Requirement: Agency arrest display is deferred

The agency page SHALL omit the full arrest breakdown display while its presentation is deferred. The personnel-and-agency beat map (capability `arrest-beat-maps`) SHALL be displayed independently. Agency arrest counts SHALL remain available in the data layer through the agency scope of `arrest_coverage` and `arrest_breakdown`, never as sums of personnel counts.

#### Scenario: Irving has an imported profile

- **WHEN** a visitor opens the Irving agency page
- **THEN** the page does not render the full arrest breakdown section
- **AND** related personnel arrest sections remain visible
