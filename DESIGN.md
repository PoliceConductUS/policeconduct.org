# DESIGN.md

Purpose

- This file is the canonical design system standard for PoliceConduct.org.
- Frontend work must follow this file and `.impeccable.md` before adding page-local styles.
- The site is a public-interest records product. Consistency and clarity are part of the trust model.

Design Register

- Product/data UI, not a marketing site.
- Light-mode-first, civic, sober, editorial, dense, and scannable.
- Familiar patterns are a feature: shared header/footer, breadcrumbs, tables, filters, metric cards, panels, and links should behave the same everywhere.

Typography

- Use one primary sans family across product/data pages, including the home page.
- Do not switch H1/H2/H3 font families by page type.
- Do not use Bootstrap `display-*` classes to change semantic heading size. If an H1 is present, it must render as the site H1 token. If an H2 is present, it must render as the site H2 token.
- Use `rem` font sizes. Do not use viewport-scaled heading sizes for product/data pages.
- Letter spacing is `0` for normal headings and body text. Use positive tracking only for short uppercase labels/eyebrows.
- Body text must be at least `1rem`.

Type Tokens

- `--ipc-font-ui`: primary interface font stack.
- `--ipc-type-h1`: page H1 size, `3rem` desktop, `2.25rem` mobile.
- `--ipc-type-h2`: section H2 size, `1.5rem`.
- `--ipc-type-h3`: subsection H3 size, `1.1875rem`.
- `--ipc-type-h4`: minor heading H4 size, `1.0625rem`.
- `--ipc-type-h5`: compact heading H5 size, `1rem`.
- `--ipc-type-h6`: smallest heading H6 size, `0.875rem`.
- `--ipc-type-body`: body size, `1rem`.
- `--ipc-type-small`: secondary metadata size, `0.875rem`.
- `--ipc-type-caption`: compact label size, `0.75rem`.
- `--ipc-weight-body`: 400.
- `--ipc-weight-label`: 650.
- `--ipc-weight-heading`: 700.
- `--ipc-leading-heading`: 1.05 for H1, 1.15 for H2/H3.
- `--ipc-leading-body`: 1.5.

Heading Rules

- H1: one per page, primary page title only.
- H2: major content section or panel title.
- H3: subsection inside a section.
- H4/H5/H6: minor section headings only; each level must be no larger than the level above it.
- Do not style the same concept as H1 on one page and `display-4`/`display-5` on another.
- Do not add page-local H1/H2 font-family, font-size, font-weight, line-height, or letter-spacing unless creating a new shared token first.
- If a compact panel title cannot visually support H2 sizing, use a non-heading element with a shared label class, or use H3 if it is semantically a subsection.

Spacing

- Use shared layout containers and predictable vertical rhythm.
- Avoid one-off margins that make page headers look unrelated.
- Dense record pages should stay compact, but not by shrinking heading type.

Color

- Primary text: restrained navy/ink.
- Accent colors must have roles:
  - Budget/income: green.
  - Liability/debt/load: red.
  - Civil cases/legal uncertainty: purple.
  - Neutral metadata: muted ink.
- Do not use decorative gradients, glassmorphism, neon palettes, or purple-blue gradient themes.

Copy

- Public-facing copy must target an 8th-grade reading level.
- Use a 10th-grade reading level only when precision requires it.
- Labels, headings, buttons, captions, and empty states must use familiar words instead of technical, legal, or data-analysis terms.
- Replace technical or legal public labels with familiar wording.
- A tooltip, definition, or detail-page explanation may show the original source/legal term when needed, but the visible label must remain familiar.
- Prefer short sentences, direct labels, and concrete counts or time windows.
- Avoid jargon such as `denominator`, `cohort`, `methodology`, `scope`, `source basis`, `disposition`, `adjudication`, `impeachment`, and `exculpatory` in public copy. If the original term is needed, place it in a tooltip, definition, or detail page.
- Use `Updated {date}` as the standard public label for known update dates. If no update date exists, omit the field; do not show `--`, "pending", "unknown", "not available", or similar placeholder text for update metadata.

Components

- Reuse shared components for entity headers, metric grids, data panels, action buttons, breadcrumbs, and topic pages.
- Do not copy/paste page-local versions of heading or metric styles.
- No nested cards.
- No placeholder copy that explains missing data. Use neutral empty values such as `--` only where explicitly approved.

Verification

- Before completing frontend work, audit H1/H2/H3 usage on changed pages.
- The home page, civil case detail pages, civic index pages, agency pages, personnel pages, and collection pages must use the same heading tokens for the same heading levels.
- Run `npm run astro -- check` after typography or component changes.
