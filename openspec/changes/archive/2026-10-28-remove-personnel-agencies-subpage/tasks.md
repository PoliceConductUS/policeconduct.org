## 1. Retire the personnel agencies subpage

- [x] Remove the `agencies` topic from the personnel topic config and the `[topic]` route.
- [x] Link the profile Agencies metric card to the on-page assignment table.
- [x] Redirect published `/personnel/{slug}/agencies/` URLs to `/personnel/{slug}/`.
- [x] Update the Civic Index spec and the affected e2e coverage.
- [x] Run the full validation gate on the final PR head.
- [x] Obtain human merge approval and merge (PR #34, squashed as `6d5d429`).

Production release is a separate state from merge and is not a task of this
change. The retired URLs stop being generated, and their redirects start
resolving, on the next production deploy.
