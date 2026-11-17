## Design Summary

The user's Search Console fix includes two verified legacy static URLs without trailing slashes: /privacy-policy and /partner/prosecutor. Their trailing-slash counterparts already map to verified current destinations.

## Alternatives Considered

1. Add exactly the two missing source keys to the generated redirect inventory.
2. Normalize every router request: rejected because it changes unrelated URL behavior.
3. Generate slash variants for every alias: rejected because the request identifies only two missing static aliases.

## Agreed Approach

Add literal source paths without normalizePath, retaining existing slash entries and destinations. Parent owns review and deployment.

## Key Decisions

The loader and router preserve exact paths; no runtime changes are necessary.

## Open Questions

None for implementation. Live redirect publication remains a release step.
