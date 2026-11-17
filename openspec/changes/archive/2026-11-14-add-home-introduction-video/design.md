## Context

The home page begins with a hero followed by National overview. The site already
uses `getVideoEmbedUrl` for YouTube playback and Bootstrap 16:9 ratio wrappers.

## Goals / Non-Goals

**Goals:** Make the published introduction playable on the home page, with
responsive sizing and an accessible player title. Under the explicit follow-up
approval, provide a readable summary and accurate video metadata for the same video.

**Non-Goals:** Watch routes, a full on-site transcript, new dependencies, database
changes, unrelated SEO/AI files, and changes to other home-page sections. Captions
and Search Console monitoring are account work coordinated separately. The
follow-up approval supersedes the original exclusion of video metadata.

## Decisions

- Place the section immediately after the hero and before National overview.
- Use the shared container, spacing, H2 class, and ratio utilities. Add no CSS.
- Introduce the player with one short factual sentence.
- Resolve the actual published YouTube URL using `getVideoEmbedUrl`.
- Lazy-load the iframe, allow fullscreen, and do not request autoplay.
- Put a short, factual summary below the iframe. Describe public police records,
  public experiences, choosing a state, finding an agency, personnel, public
  reports, civil cases, sharing experiences, volunteering, and donating. Make no
  claim that records or reports are verified or accurate.
- Follow with natural links to `/find-records/`, `/report/new/`, and `/data-and-methods/`.
- Keep video metadata in one page-local object. Reuse its name and embed URL in
  the iframe and its description as visible summary text. Add its VideoObject to
  the existing structured data, with publisher referencing the existing organization.
- Use the observed publication date, source duration `PT1M41.68S`, language `en`,
  the actual YouTube embed URL, and the approved 1280×720 local JPEG thumbnail.
  Do not label a YouTube watch page as `contentUrl`.
- Existing robots rules permit the home page and thumbnail; preserve them.

## Risks / Trade-offs

Playback depends on YouTube availability and the published video's embed setting.
Confirm the real published URL before rendering and inspect desktop/mobile
placement with the final embed URL.
