# Personnel user-generated content suspension

Community submissions about named individual personnel are suspended.

Roster facts and anonymous community submissions rendered side by side on the
same `/personnel/*` page, under the same `schema.org/Person` markup, with one
shared footer disclaimer standing in for both. A reader had no way to tell a
state licensing record from an anonymous web-form submission. The suspension
removes the intake; it does not remove pages, roster data, existing
submissions, or search indexing.

## Re-enabling

Two edits, both required. The site controls the entry points; the Lambda
controls acceptance. Flipping only one leaves either a dead button or an open
intake with no visible entry point.

1. `src/lib/ugc-policy.ts`

   ```ts
   export const PERSONNEL_UGC_SUSPENDED = false;
   ```

2. `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`

   ```js
   const SUSPENDED_FORM_NAMES = new Set([]);
   ```

Then delete `scripts/personnel-ugc-suspension.test.mjs` and the three
suspension tests in the forms-api test file, in the same commit — see the
regression note below for why. Then deploy the site and the forms-api Lambda.

**Re-enable only when a moderation queue with a named operator and a stated
turnaround exists.** This is a condition, not a date. As of 2026-10-24 no such
queue exists: the submissions bucket has an empty notification config, so
nothing is told a submission arrived (INS-35), which is why the suspension is
still in force.

## What the suspension covers

| Surface                                                                                                      | Suspended | Where                                                         |
| ------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------- |
| Disqus comment threads on `/personnel/*`                                                                     | Yes       | Not rendered; enforced by `npm run validate:personnel-ugc`    |
| "Suggest edit" on a personnel profile (`officerEdit`)                                                        | Yes       | Entry point hidden; form replaced; API returns 403            |
| "Submit past employer" / "Suggest new person" (`personnelNew`)                                               | Yes       | Entry point hidden; form replaced; API returns 403            |
| Officer-prefilled "Share your experience" on a personnel profile                                             | Yes       | Entry point hidden                                            |
| Agency `suggest-edit`, `agencyNew`, `civilLitigationNew`, `contact`, `volunteer`, `dataSubjectAccessRequest` | No        | Unchanged                                                     |
| Site-wide report intake at `/report/new/`                                                                    | No        | Unchanged, still linked from the header and from agency pages |
| Which `/personnel/*` URLs exist, `robots` meta, canonicals, `robots.txt`, sitemaps                           | No        | Unchanged                                                     |

## Deliberate scope deviation

INS-17 scoped agency pages as unaffected. One agency-page control is removed:
the "Suggest new personnel" button, which pointed at `/personnel/new/`.

That form creates a record about a named human being from an anonymous
submission. Leaving it reachable from the agency page would have kept the
personnel intake fully open while reporting it as suspended. Nothing else on
agency pages changed — the removal is one button and its prefill script, and
reverting it is the same one-line flip.

## Enforcement

- `npm run validate:personnel-ugc` runs inside `npm run build` and fails the
  build if a generated `/personnel/` page carries a Disqus thread, a personnel
  submission form, or a link to one. A redesign that reintroduces a comment
  thread on a named individual's profile breaks the build rather than shipping.
- The forms API rejects suspended form names before reCAPTCHA verification and
  before any S3 write, so a suspended submission is never stored. Rejections
  are logged as `forms.submit.suspended_form_name` and are countable.

## Known gaps

- `/report/new/` remains open site-wide and its free-text fields still allow a
  submitter to name an officer. Closing that path means either moderating
  reports or taking down site-wide report intake, which is out of scope here.
- Draft autosave (`POST /forms/draft`) is not form-name scoped, so a personnel
  form draft could still be stored if a client posted one. Drafts are never
  published and cannot become a submission while the submit route rejects the
  form name.
- Submissions already accepted and rendered on live personnel pages are out of
  scope. They are covered by the lineage reconstruction and field-suppression
  work (INS-18 / INS-10).

## 2026-10 regression (INS-70)

This control was added on 2026-08-24, deployed on 2026-09-16, and then **lost
without anyone deciding to lift it**. On 2026-09-28 `main` was merged into the
long-lived `codex/redesign-civic-index-pages` branch (`997c12a`); that branch
predated the suspension, and the merge resolution dropped it. The regression
reached `main` on 2026-10-15 (`fc0e88b`) and production on 2026-10-21.

Everything PR #8 shipped disappeared in the same merge — the policy module, the
notice component, the page gating, the docs, **the validator that was supposed
to catch this, and the `validate:personnel-ugc` wiring that ran it**. The forms
API test that asserted the 403 was replaced by one asserting the opposite, so
CI actively certified the regression as correct.

Why it was invisible: `git log -S'SUSPENDED_FORM_NAMES'` finds nothing on
`main`, because the removal exists only inside merge commits and `git log -S`
skips those by default. Use `git log -S'<symbol>' --full-history -m` when
auditing whether a control still exists.

The submission store corroborates the window exactly: `personnelNew` /
`officerEdit` objects arrive through 2026-09-03, stop entirely between
2026-09-16 and 2026-10-21, and resume on 2026-10-24.

### What now guards it

`scripts/personnel-ugc-suspension.test.mjs` runs in `npm run test` — no build
required — and fails if any part of the control goes missing: the policy flag,
the Lambda's `SUSPENDED_FORM_NAMES`, the gate's position before reCAPTCHA and
before any write, the gating on each entry-point page, a personnel intake URL
appearing in an ungated source file, or the `validate:personnel-ugc` wiring
itself. It deliberately hard-codes what it expects rather than importing the
policy module, because a guard that derives its expectations from the thing it
guards cannot notice that thing being deleted.

Re-enabling intake therefore means deleting that tripwire and the three
suspension tests in the forms-api test file, in the same commit that lifts the
suspension — so the intent is recorded rather than inferred from an absence.
