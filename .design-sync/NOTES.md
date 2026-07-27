# design-sync notes

## Shape: reference (off-script)

This repo is **not** a component-library design system — it's an Astro app (`policeconduct.org`)
styled with Bootstrap + hand-written CSS. There is no Storybook and no bundlable component
package, so the standard `/design-sync` converter does not apply.

Per an explicit user decision, we sync the **civic-index redesign mockups** in
`mockups/civic-index-redesign/` as full-page **reference cards** to the Claude Design project.

## What gets synced

The **latest version** of each distinct page type (all link `shared-v5.css`; agency profile
also uses `agency-entity-v5.css`; all but personnel-profile use `app.js`):

| Group                 | Card                | Source mockup               |
|-----------------------|---------------------|-----------------------------|
| State & County Index  | Texas               | texas-v9.html               |
| State & County Index  | Wyoming             | wyoming-v5.html             |
| State & County Index  | Counties            | counties-v5.html            |
| State & County Index  | County Detail       | county-v6.html              |
| State & County Index  | Place               | place-v6.html               |
| Agency                | Agency Profile (state/local) | agency-entity-v8.html |
| Agency                | Agency Profile (federal)     | federal-agency-v1.html |
| Agency                | Agency Civil Cases  | agency-civil-cases-v5.html  |
| Agency                | Agency Personnel    | agency-personnel-v5.html    |
| Records               | Personnel Profile   | personnel-profile-v8.html   |
| Records               | Civil Case Detail   | civil-case-detail-v6.html   |
| Records               | Report Detail       | report-detail-v5.html       |

## Build procedure (to re-sync after editing mockups)

A small Node script inlines `shared-v5.css` (+ page CSS) and `app.js` into each page, strips
the `.variant-banner` mockup nav div, and prepends a `<!-- @dsCard group="…" name="…" -->`
first line. Output layout uploaded to the project:

```
styles.css                       # = shared-v5.css (design language for new designs)
app.js
README.md                        # conventions header (design vocabulary)
components/<group-slug>/<name>/<name>.html
```

**When mockups change**: bump to the new latest `-vN` files in the table above, rebuild,
re-run the sync into project `6141647b-d0aa-4124-9ebc-628b0fd47be3`.

## Gotchas

- `Public Sans` (`--font-ui`) is referenced but **not bundled**; falls back to system fonts.
- `DESIGN.md` is referenced in CSS comments but does not exist in the repo.
- Cards are inlined/self-contained so they render without the relative `shared-v5.css` link.
- **Bootstrap Icons**: mockup source uses `<i class="bi bi-*">` + the bootstrap-icons CDN
  stylesheet. The project CSP blocks that CDN, so the card build keeps the `<i>` tag and
  swaps the CDN `<link>` for an inline `@font-face` (bootstrap-icons.woff2 as a data URI) +
  the used-glyph `::before` rules (see `BI_CODEPOINTS` / `biInlineStyle` in build.mjs). When
  a new `bi-*` icon is used in a synced page, add its codepoint to `BI_CODEPOINTS`. The
  woff2/codepoints came from bootstrap-icons@1.11.3 (bi-youtube = `\f62b`,
  bi-chevron-down = `\f282`).
