## Why

Personnel pages publish facts about named people with no citation. Across every migration, `provenance`, `citation`, `retrieved_at`, `attribution` and `evidence` occur zero times, so a state licensing record and a note someone typed into a form on this site render identically. A wrong field about a named person is the worst error this site can make, and nothing currently stops one from reaching a page.

## What Changes

Carry provenance from the source artifact through to the rendered field, and make the data-access layer the only place field exposure is decided. Every personnel value a page renders arrives with the dataset it came from, what is attested about that dataset, and how confidently the row was matched to its source record. Values that fail the contract are withheld and never replaced with a placeholder. Roster records and submitted content are marked differently in the markup, in words, and visually.

Provenance is resolved per row from the identity map written when the source production was loaded. It is never applied in bulk: a row the ledger does not cover has no citation and is withheld.

## Impact

Personnel profile rendering, the personnel and agency-assignment reads, the prefill payloads those pages ship, and a new build step that derives the ledger from the source artifact. No change to which personnel URLs exist, to indexing, or to `robots.txt`. No schema change is required to ship; provenance columns are read in preference to the ledger the moment they exist.
