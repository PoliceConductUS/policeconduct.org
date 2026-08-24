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

Then deploy the site and the forms-api Lambda. Re-enable only when a moderation
queue with a named operator and a stated turnaround exists.

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
