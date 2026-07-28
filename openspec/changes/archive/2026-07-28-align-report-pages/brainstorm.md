# Brainstorm — align-report-pages

## Design Summary

Close the gap the `redesign-civic-index-to-production` cycle left open: the
experience-report surfaces. Three deliverables, one PR:

1. **Report detail page** ported to the approved mockup
   (`mockups/civic-index-redesign/report-detail-v5.html`) using the shared
   components already on this branch — with owner-ruled amendments (below).
2. **Field-level parity** between what `/report/new` collects, what the data
   model stores, and what the detail page displays post-approval — every field
   gets an explicit disposition; nothing silently dropped or orphaned.
3. **Report-count correctness**: the agency personnel page reads
   `officers_stats.review_count` (a projection that can be stale/empty) and
   renders 0 while reports exist; unify on the live join `personnel.ts` uses.

The alignment matrix (evidence-gathered from the form's controls, the schema
contract, the detail template, and the mockup):

| Field | Collected (`/report/new`) | Stored | Displayed post-approval (ruling) |
|---|---|---|---|
| incident date | ✓ | `reviews.incident_date` | ✓ fact-list |
| incident time | ✓ | verify column | ✓ with date, when present |
| location | ✓ | `address`/`location_path_id` | ✓ fact-list |
| agency | ✓ | via location/agency link | ✓ fact-list (linked) |
| submitter relationship | ✓ | verify column | ✓ "Submitted by" fact |
| what happened / story | ✓ | `description` | ✓ "What happened" body |
| how it felt | ✓ (spec-required prompt) | verify column | ✓ **labeled subjective section** (owner ruling) |
| interaction type | ✓ | verify column | ✓ fact-list, when present |
| setting | ✓ | verify column | ✓ fact-list, when present |
| purpose | ✗ (no distinct form field) | n/a | **not collected — removed from display set (owner ruling)** |
| complaint filed / case number | ✓ | verify columns | ✓ fact-list, when present |
| bodycam requested | ✓ | verify column | ✓ fact-list, when present |
| records requested | ✗ (no distinct form field) | n/a | **not collected — removed from display set (owner ruling)** |
| charges / charge outcome | charges: ✗ (submitter-provided, pre-existing column); outcome: ✗ (post-submission reality) | charges: `reviews.charges`; outcome: no column yet | charges: submitter-provided, displayed as "Charges"; charge outcome: future editor-added (pending intake migration) |
| desired outcome | ✓ (`reportPurpose`) | `desired_outcome` | ✓ when present |
| reporter name/email/phone/contact pref/consent | ✓ | internal | **never displayed** (privacy) |
| per-officer ratings | ✗ (spec forbids initial scoring) | `review_officers.rating_overall` | **removed from report detail** (owner ruling; stays on personnel/agency surfaces) |

## Alternatives Considered

### Option A: Display-only port (mockup verbatim)
- **Approach**: Port report-detail-v5 exactly; leave the form and data flow alone.
- **Pros**: Smallest diff; pure port like the other templates.
- **Cons**: Leaves collected-but-never-displayed fields undocumented and the
  ratings/feelings contradictions unresolved — precisely the drift the owner
  flagged.
- **Why not chosen**: The owner's requirement is explicit three-way alignment,
  not a visual port.

### Option B: Full parity with owner-ruled dispositions (chosen)
- **Approach**: Port the detail page with the three rulings applied (ratings
  removed, feelings in a labeled subjective section, fact-list extended);
  verify a storage path for every displayed field (migrations/contract updates
  where genuinely missing, rendered only when present — no silent fallbacks);
  codify the parity table in a new `report-pages` capability spec.
- **Pros**: Every field has one documented disposition; the spec prevents
  future drift; display extension matches what is actually collected.
- **Cons**: Touches schema-contract territory if columns are missing; larger
  than a visual port.
- **Why chosen**: It is the stated requirement for this PR.

### Option C: Trim collection to the mockup's display set
- **Approach**: Stop collecting anything the mockup doesn't display.
- **Pros**: Parity by subtraction; no storage verification needed.
- **Cons**: Deletes spec-required prompts (feelings) and moderation-valuable
  context; modifies `interaction-submission-flow` requirements; loses data.
- **Why not chosen**: Owner ruled the opposite direction (display more).

## Agreed Approach

Option B, plus the report-count loader fix, implemented on the existing
redesign branch and shipped in the same PR. `/report/new` keeps its current
UX (governed by `interaction-submission-flow`); its restyle to the redesign
chrome/tokens is explicitly deferred (no mockup exists for it) — parity here
is about fields, not the form's visual design.

## Key Decisions

1. Ratings removed from report detail; rating data remains stored but no
   site surface currently renders it (re-surfacing it elsewhere is a future
   product decision).
2. Feelings displayed post-approval in a clearly-labeled subjective section;
   the "Facts, not feelings" aside copy is rewritten to explain the
   facts/feelings separation instead of denying feelings display.
3. Fact-list extended to every collected contextual field, rendered only when
   present; submitter-provided charges render as a "Charges" fact, while
   charge outcome is codified as a future editor-added field pending the
   intake migration.
4. Reporter identity/contact/consent are internal-only, never rendered.
5. Every displayed field must have a verified storage path; genuinely missing
   columns get migrations + schema-contract entries (repo data rules: explicit
   values, no silent fallbacks, missing required data fails builds).
6. Agency personnel report counts switch to the live
   `review_officers ⋈ agency_officers` join (same as `personnel.ts`).
7. In-session verification continues under the owner's no-full-build rule
   (astro check, eslint, dev-server spot checks); full gates ride the PR's CI.

## Open Questions

- Whether any of the "verify column" fields genuinely lack storage (inspect
  the draft endpoint's persistence and the live schema during implementation);
  each miss becomes a migration + contract entry, not a silent omission.
