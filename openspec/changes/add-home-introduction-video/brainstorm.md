## Design Summary

Home-page visitors can watch the published introduction to PoliceConduct.org
between the existing hero and National overview. The requested addition uses
the existing page layout and video URL helper.

## Alternatives Considered

- Embed the video on the home page: makes the introduction directly available
  where requested and reuses existing responsive video utilities. Selected.
- Link to YouTube only: requires leaving the home page and does not provide the
  requested home-page playback.
- Add a dedicated watch page: introduces a route and additional content outside
  the requested home-page embed.

## Agreed Approach

Add one section with the shared H2, one factual introductory sentence, and a
lazy-loaded 16:9 YouTube iframe. Keep the existing hero and map intact.
The direct implementation request approves this narrowly scoped addition.

## Key Decisions

- Heading: “What is PoliceConduct.org?”
- Copy: “Watch this introduction to finding records and sharing experiences on
  PoliceConduct.org.”
- Use `getVideoEmbedUrl`, Bootstrap ratio utilities, and shared section spacing.
- Include an accessible iframe title, fullscreen support, and no autoplay.
- No dependencies, database changes, watch page, transcript, or video schema.

## Open Questions

None. The published YouTube URL is
`https://www.youtube.com/watch?v=xA6z1L-MG_k`.
