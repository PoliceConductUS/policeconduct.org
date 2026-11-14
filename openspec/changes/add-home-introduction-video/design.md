## Context

The home page begins with a hero followed by National overview. The site already
uses `getVideoEmbedUrl` for YouTube playback and Bootstrap 16:9 ratio wrappers.

## Goals / Non-Goals

**Goals:** Make the published introduction playable on the home page, with
responsive sizing and an accessible player title.

**Non-Goals:** Watch routes, transcripts, structured video metadata, new
dependencies, database changes, and changes to existing home-page sections.

## Decisions

- Place the section immediately after the hero and before National overview.
- Use the shared container, spacing, H2 class, and ratio utilities. Add no CSS.
- Introduce the player with one short factual sentence.
- Resolve the actual published YouTube URL using `getVideoEmbedUrl`.
- Lazy-load the iframe, allow fullscreen, and do not request autoplay.

## Risks / Trade-offs

Playback depends on YouTube availability and the published video's embed setting.
Confirm the real published URL before rendering and inspect desktop/mobile
placement with the final embed URL.
