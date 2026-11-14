# Production Canonical URLs Implementation Plan

> Use superpowers:subagent-driven-development for the scoped implementation.

**Goal:** Canonical metadata always identifies production.

**Architecture:** Use the existing Astro.site configuration in SiteLayout. Preserve path resolution and deployment scripts.

**Tech Stack:** Astro, Node 24, existing test tools.

**Spec:** specs/production-canonical-urls/spec.md

## Task 1: Shared layout metadata

- [x] Add regression coverage that renders real page metadata with a preview SITE_URL and expects production canonical and Open Graph URLs, preserving a nested path. Exercise localhost without SITE_URL too.
- [x] Run it against the existing layout and record the incorrect preview URL.
- [x] Remove only the environment-origin override in src/layouts/SiteLayout.astro.
- [x] Run the regression again, inspect the diff, and run npm run validate. Resolve concrete failures as requested; ask only for ambiguous decisions.
