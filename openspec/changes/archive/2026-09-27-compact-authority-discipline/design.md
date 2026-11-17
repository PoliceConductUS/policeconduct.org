# Design

Reuse shared civic headings, typography, colors and spacing. Each discipline item shows a personnel link plus action/date/case in a compact layout that stacks on mobile. Supplied source document links remain visible without opening details. Put optional allegation, rule violation, finding, chief action, penalty and end date in native details, only when present.

Search the full collection case-insensitively by person or case number. Client controls progressively enhance server HTML, display ten matches per page, reset to first page when search changes, provide Previous/Next buttons and a live result range, and show a neutral no-match message. Search is available only after initialization so no nonfunctional controls appear without JavaScript. Native disclosure works without script. Do not add URL state: the existing authority canonical URL continues to identify the whole collection.

Section links include only existing Licenses, License actions and Discipline records sections. Keep the ordering supplied by the loader and communicate newest effective dates first. Do not fabricate meanings for SACO or documents when the DB supplies none.
