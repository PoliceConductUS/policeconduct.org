## Why

`/personnel/*` pages render two very different kinds of claim in the same
place: state licensing roster facts, and anonymous community submissions.
They share one `schema.org/Person` block and one footer disclaimer, so a
reader — or an automated consumer of that structured markup — cannot tell
which claim is which. The site's editorial voice is implicitly extended over
content nobody reviewed.

The roster data is not the problem. Accurate republication of a public
licensing roster is defensible. The commingling is the problem, and unlike the
sourcing work it can be fixed now.

There is also no moderation queue with a named operator. A queue nobody works
is worse than no queue: it creates the obligation and documents the failure to
meet it. Intake stays closed until an operator and a turnaround exist.

## What Changes

**Personnel comment threads**

- From: `/personnel/*` could carry a Disqus thread on a named individual's
  profile. `PersonnelCard.astro` still emitted a link to `#disqus_thread` on a
  personnel profile.
- To: No `/personnel/` page renders a Disqus thread, and a build-time check
  fails the build if one reappears.
- Reason: A comment thread under a named officer's `schema.org/Person` markup
  is the highest-risk surface on the property.
- Impact: User-visible removal on personnel pages. Report-page comment threads
  are unchanged.

**Personnel submission intake**

- From: `personnelNew` and `officerEdit` accepted anonymous submissions that
  create or amend a record about a named human being. Personnel profiles also
  offered an officer-prefilled entry into `/report/new/`.
- To: Both form names are rejected by the forms API with HTTP 403 before
  reCAPTCHA verification and before any write. Their entry points are not
  rendered, and both form pages render a paused notice with routes to the
  correction/removal form, the agency edit form, and contact.
- Reason: Accepting a claim about a named individual with no reviewer is the
  exposure this change exists to close.
- Impact: User-visible removal of three personnel-page controls, one
  personnel-index control, and one agency-page control. Both intake pages keep
  their URLs and their existing `noindex,follow`.

**Agency-page personnel intake**

- From: Agency pages linked to `/personnel/new/` via a "Suggest new personnel"
  button.
- To: That one button is not rendered. Everything else on agency pages is
  byte-identical.
- Reason: The button is a second door into the same personnel intake. Leaving
  it open would mean reporting the intake as suspended while it stayed open.
- Impact: One control removed from agency pages. This is a deliberate
  deviation from the "agency pages unaffected" scope and is documented in
  `docs/personnel-ugc-suspension.md`.

**Not changed**

- Which `/personnel/*` URLs exist, `robots` meta tags, canonicals,
  `robots.txt`, and sitemaps. Verified byte-identical against `main`.
- Agency, civil litigation, contact, volunteer, DSAR, and site-wide report
  intake.
- Submissions already accepted and rendered on live personnel pages.

## Backward compatibility

This intentionally breaks personnel submission intake for the public. That is
the point of the change, and it is reversible in one line per deployable unit.

## Evidence expectations

No claim about an individual is added or removed by this change. It only
removes intake surfaces. The corpus-level sourcing question is separate work.
