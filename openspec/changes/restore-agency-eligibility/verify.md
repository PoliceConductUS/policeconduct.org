# Verification — October 6, 2026

Final rules: agency office records require at least one current or former personnel assignment, regardless of federal status. Reports, cases and personnel-linked coverage already depend on assignments. Root `federal_agency` records always receive detail pages and directory entries; office lists and counts omit offices without assignments.

- Projection regression failed before implementation on the over-generated agency set.
- Legacy TSA alias regression failed before implementation; after the change all four redirect generator tests passed, including strict missing-retained-agency validation.
- Local projection refresh: 3,404 generated agency records out of 3,504; 100 excluded. TSA Headquarters has zero agency projections. Database has 11 root federal agencies.
- Final focused browser/data suite: 11 passed. Checks cover the exact eligible projection set, omission from place navigation, always-visible root federal directory entries and empty root pages, qualifying office counts/URLs, and excluded empty federal office projections.
- `npm run validate`: exit 0; browser suite 142 passed, 1 skipped. This run began before the final root-federal clarification; final affected tests were then rerun successfully, along with fresh formatting, ESLint, Astro types and OpenSpec validation.
- Final Astro types: 0 errors, 0 warnings, 3 existing hints. OpenSpec: 17 passed, 0 failed. `git diff --check` passed.

A navigation failure came from an existing dev-server location-payload cache loaded before the refresh. The stored payload already excluded the agency; invalidating the local module cache fixed the browser result without changing cache behavior.

No full production static build or deployment was performed. Existing built/deployed files are unchanged; the restored enumeration governs the next build. Prior discipline display edits were preserved.
