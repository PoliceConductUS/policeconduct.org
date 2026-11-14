## Design Summary

Canonical URLs must always use the production origin, including preview builds.

## Alternatives Considered

A deployment-specific canonical origin caused preview metadata to reach production. Using the existing configured Astro site removes that dependency without another setting.

## Agreed Approach

The user explicitly requested production-only canonical URLs. Remove the shared layout's environment override and use Astro.site.

## Key Decisions

Keep route paths and existing deployment mechanics unchanged.

## Open Questions

None.
