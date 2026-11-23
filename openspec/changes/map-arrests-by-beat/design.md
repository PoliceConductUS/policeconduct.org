# Design: arrest beat maps

## Data

All map data comes from the intake change `import-arrest-records`:

- `arrest_coverage`: for each scope (an agency, or an agency plus one `agency_personnel` row), the first and last month and the number of distinct bookings (the map total).
- `arrest_breakdown`, arrest-beat dimension: one row per beat with arrests in that scope, with `arrest_count`, plus the row for arrests with no beat (the not-mapped count).
- `police_beat`: the boundary (`code`, `name`, `geometry`) that each beat row names through the recorded beat reference (`arrest.police_beat_id`).
- `data_annotation` joined to `data_annotation_message` (intake `supply-site-display-data`): the annotation for arrests with no beat, with its public message.

The site reads no other arrest-record field (intake `import-arrest-records` D7).

## Interior label point

Each beat label sits on a point inside its polygon, not on the bounding-box center. `src/lib/data/arrest-beats.ts` scans the polygon with horizontal lines and picks the middle of the widest interior span. Holes are excluded from the span. For a MultiPolygon, the widest span across all parts wins. This keeps the label inside concave beats and beats with holes.

## Label placement

`src/components/ArrestBeatMap.astro` draws compact labels (beat name · count). When a label would overlap another, the script searches nearby spots for a free one and draws a connector line from the label to its anchor. When no free spot is found, a label stays on its anchor and may overlap. Placement reruns on zoom, move and resize.

## Which beats are drawn

After tasks 2.1, 3.1 and 3.2: the map draws exactly the beats in its scope's `arrest_breakdown` beat rows, each with its `police_beat` boundary (owner decision Q34). A grouped view has no row for a beat with no arrests, so the site filters nothing (AGENTS.md "The Site Is A View Of The Database"). Intake places arrests in beats by location, including beats the city marks inactive, so an inactive beat with arrests is drawn with its count. Arrests with no beat appear as the not-mapped count. Intake also records an annotation on the agency (owner decision Q34), which the agency page shows through `RecordDataNotes`.

## Personnel map scope

A personnel map shows the counts of one `agency_personnel` row from the personnel scope of `arrest_coverage` and `arrest_breakdown`. Its boundaries are the `police_beat` rows that those beat rows name. Intake links each arrest to its officers through `arrest_agency_personnel`; the site does not match records by source, months, names or codes.

## Boundary snapshot

The boundaries are one supplied snapshot with no dates, and the map says so. There is no basemap: polygons are drawn on a plain background because pages make no calls to other sites.
