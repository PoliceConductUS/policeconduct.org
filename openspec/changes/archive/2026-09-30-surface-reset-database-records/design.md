## Context

The database has 29 public tables. Live counts include 3,300 agencies, 140,552 personnel, 1,769,990 education records, 163,805 licenses, 188,003 license actions, 76 discipline records, 465 civil cases, 3 reports, and 320 arrest profiles. Every personnel record has an assignment. All agency locations are places. Existing histories render all records rather than truncating them.

## Decisions

Extend existing pages. All agencies with required canonical data receive projections. Arrest profiles join through agency_personnel to personnel and remain assignment-specific. A small loader and component render coverage and every available breakdown among seven supported dimensions; counts are paired with percentages of the profile's recorded total, temporal rows show the trend, and source values are preserved. No peer rank is inferred from periods of differing duration, and officer counts are not summed into unique agency arrests. District codes are source codes without asserted geographic meaning.

Render report how_felt using its real storage column, desired_outcome and other present narrative facts with reader-friendly headings. Render case date_terminated as Closed. Preserve authored text and existing evidence links. Optional absent facts are omitted. Read DESIGN.md and .impeccable.md; use shared headings and external CSS.

## Verification

Write focused regressions before implementation; compare rendered output with live values, including all arrest breakdown entries and all agency projections. Run format, aggregate validate, and full build. Inspect desktop/mobile representative pages. Commit and sync current branch, build the committed version for PR 3, publish complete dist, and check remote HTML, assets, search, canonical paths, and build identity.
