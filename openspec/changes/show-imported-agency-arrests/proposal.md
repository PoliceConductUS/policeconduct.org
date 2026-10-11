# Why

The imported agency arrest profile is absent from the agency page, and personnel rendering still expects obsolete offense/charge/district keys.

# What Changes

Load agency_arrest_profile by exact resolved agency ID and update the personnel presentation to current imported dimensions. The agency-page arrest display is deferred at the user's request; retain imported data and personnel display. Require the agency profile table in schema validation. No intake or database changes.

# Impact

Agency detail, personnel arrest component and types, schema validation, and database-backed browser tests. No compatibility aliases for obsolete breakdown keys.
