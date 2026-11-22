# Design: arrest beat maps

## Interior label point

Each beat label sits on a point inside its polygon, not on the bounding-box center. `src/lib/data/arrest-beats.ts` scans the polygon with horizontal lines and picks the middle of the widest interior span. Holes are excluded from the span. For a MultiPolygon, the widest span across all parts wins. This keeps the label inside concave beats and beats with holes.

## Label placement

`src/components/ArrestBeatMap.astro` draws compact labels (beat name · count). When a label would overlap another, the script searches nearby spots for a free one and draws a connector line from the label to its anchor. When no free spot is found, a label stays on its anchor and may overlap. Placement reruns on zoom, move and resize.

## Which beats are drawn

The map draws only beats with at least one arrest in that map's counts. Intake places arrests in beats by location, including beats the city marks inactive, so an inactive beat with arrests is drawn with its count and no beat shows a false zero. Arrests with no beat appear as the not-mapped count; intake also attaches a data note to the agency, which the agency page shows through `RecordDataNotes`.

## Personnel map boundaries

A personnel map takes its boundaries from the agency arrest profile named by `arrest_profile.agency_arrest_profile_id`. Intake sets that foreign key in the transform that writes both profiles. `src/lib/data/arrest-profiles.ts` joins on it. When a personnel profile has `by_arrest_beat` and the column is null, the loader throws `Missing agency arrest profile link for arrest profile {id}`, with the id read from the row. The site does not match profiles by source, months or any other value.

## Boundary snapshot

The boundaries are one supplied snapshot with no dates, and the map says so. There is no basemap: polygons are drawn on a plain background because pages make no calls to other sites.
