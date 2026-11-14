# Verification

The local report link retains canonical ID `ttcbwuea0vqyjfwtpj89as97` and now references case `ogecfxi5p67286qbmvkfjoa4`. Its copied URL and title are null. The loader joins the current case title and stored slug and renders an ordinary internal link. External evidence and video links retain their existing behavior.

Migration `20261113000000_review_links_civil_cases.sql` was tested on an isolated database and applied locally without a reset. Manual intake acquisition and transformation generated exactly one guarded `ReviewLinkUpdate` in mutation `000017`. The CLI applied it; repeating `data up --to 000017` found zero pending entries.

The focused website checks pass: 39 data tests, including three loader regressions; seven report browser tests, including actual same-tab case navigation. Independent website and intake reviews have no remaining findings. The intake review's two PATCH regressions were reproduced and fixed in the shared canonical readers/validator.

Intake full validation passed: 180 test files, 1,842 tests, no skips; formatting, types, build, and all 48 OpenSpec items passed. Website full validation also passed: 318 Node tests and 213 browser tests, with no skips; formatting, lint, Astro (338 files, zero errors/warnings/hints), shell, schema, OpenSpec (36 items), and personal-data scanning passed.

## OpenSpec verification

Completeness: four of four tasks and two of two requirements implemented. Correctness: stable-ID conversion, current title/slug resolution, and same-tab case navigation have database, canonical IO, loader, and browser coverage. Coherence: implementation follows the approved FK design and existing mutation pipeline. No unresolved findings or exceptions.

Final commit identifiers and validation results are recorded in the completion report. Existing website PR #43 has six successful checks at its committed HEAD, which do not cover the new local commits. Intake has no open PR for the owning branch. No push, production migration, personnel publication, or deployment occurred.
