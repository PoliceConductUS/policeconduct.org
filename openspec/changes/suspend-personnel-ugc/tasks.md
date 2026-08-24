## 1. Site surfaces

- [x] 1.1 Add `src/lib/ugc-policy.ts` with `PERSONNEL_UGC_SUSPENDED`, the
      suspended form names, and the reader-facing notice copy.
- [x] 1.2 Remove the "Suggest edit", officer-prefilled "Share your experience",
      and "Submit past employer" controls from the personnel profile, and
      render a paused notice in their place.
- [x] 1.3 Remove the "Suggest new person" control from `/personnel/`.
- [x] 1.4 Remove the "Suggest new personnel" control from agency pages.
- [x] 1.5 Replace the `/personnel/new/` and `/personnel/suggest-edit/` forms
      with `PersonnelSubmissionsPaused`, and stop the form bootstrap from
      reporting a load error when a page intentionally renders no form.
- [x] 1.6 Delete the unused `PersonnelCard.astro`, the last component emitting
      a Disqus link on a personnel surface.

## 2. Forms API

- [x] 2.1 Reject `personnelNew` and `officerEdit` with HTTP 403 before
      reCAPTCHA verification and before any write, logged as
      `forms.submit.suspended_form_name`.
- [x] 2.2 Keep both names in `ALLOWED_FORM_NAMES` so re-enabling is one edit.

## 3. Validation

- [x] 3.1 Add `npm run validate:personnel-ugc` and run it inside `npm run build`.
- [x] 3.2 Lambda tests: suspended names return 403; agency and site-wide names
      are not suspended; suspended names stay in `ALLOWED_FORM_NAMES`.
      `node --test` — 6 passed.
- [x] 3.3 `npx astro check` — 0 errors across 227 files. `npx eslint .` — clean.
      `npx prettier --check` — clean.
- [x] 3.4 Local build against a fixture database: 115 pages compared against a
      `main` build; 110 byte-identical after asset-hash normalization; the 5
      that differ are the four personnel surfaces and the agency page, whose
      only diff is the removed button and its prefill script. URL set and
      sitemaps identical.
- [x] 3.5 Negative control: reinserting a `disqus_thread` div into a built
      personnel page fails `validate:personnel-ugc` with exit 1.

## 4. Documentation

- [x] 4.1 `docs/personnel-ugc-suspension.md` — the one-line flip, the covered
      surfaces, the deliberate agency-page deviation, and the known gaps.
