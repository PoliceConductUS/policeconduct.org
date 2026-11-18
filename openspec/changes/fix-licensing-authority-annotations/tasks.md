## 1. Approval

- [x] Owner approves: annotation label and message only on record pages; licensing authority page links to its paginated data-annotations page.

## 2. Record pages

- [x] Write failing tests: a record-page annotation shows label and message only, with no evidence, value, source or record ID; `excluded_records` reads "Excluded record".
- [x] Change `src/components/DataAnnotations.astro` to pass them.

## 3. Licensing authority page

- [x] Write a failing test: the licensing-authority page lists no annotations and links to its data-annotations page, which lists the annotations filed on the authority.
- [x] Remove `RecordDataNotes` from `src/pages/[category]/licensing-authority/index.astro`.

## 4. Verification

- [x] Build `/tx/licensing-authority/` before and after; record both.
- [x] Run `npm run validate` on the final head and record the results in `verify.md`.

## 5. Moved from `2026-11-18-publish-source-data-annotations` (INS-121)

Note to the developer: `publish-source-data-annotations` was merged and archived on 2026-11-18. These two tasks were incomplete, so they moved here; see that change's `verify.md` section 8.

- [ ] Extend the existing Analytics CLI with atomic remote-to-local pull and explicit local-to-remote push tasks on both sites. Missing: only the policeconduct.org property was checked; section1983.org's CLI is in its own repository and is unchecked.
- [ ] Complete aggregate validation and authorized release verification for INS-121. Missing: PR #44 (`d6c17a6`) never had a full `npm run validate` on its own head; the production release (`2c594ba`) is recorded.
