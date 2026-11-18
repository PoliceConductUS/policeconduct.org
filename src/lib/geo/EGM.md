# Geography Data (`src/lib/geo`)

## Overview

Static United States geography data used to draw state maps and to enumerate state codes. Both files are literal data with no imports and no runtime logic.

## Interface

### `states.ts`

- `StateTile` is an exported type: `{ code: string; name: string; row: number; col: number }`. `[states.ts:StateTile]`
- `US_STATE_TILES` is an exported `StateTile[]` with 51 entries: the 50 states and the District of Columbia. Each entry has a two-letter upper-case `code`, a full `name`, and 1-based `row` and `col` positions on a tile grid that approximates a map of the country. `[states.ts:US_STATE_TILES]`

### `us-state-paths.ts`

- `USA_STATE_PATHS` is the only export: a readonly array of 51 objects `{ id, d, label }`. `id` is the lower-case two-letter code, `d` is the SVG path data for the state outline, and `label` is the upper-case two-letter code. No view box, type or helper is exported. `[us-state-paths.ts:USA_STATE_PATHS]`

## Invariants

- The order of `US_STATE_TILES` is fixed by the literal and is not alphabetical; nothing sorts it. `[states.ts:code: "AK"]`
- Unique grid cells are not enforced by code, and the file has no validation and no `throw`. `[states.ts:District of Columbia]`
- `USA_STATE_PATHS` entries are in ascending order by `id`, fixed by the literal. `[us-state-paths.ts:id: "ak"]`
- Each `label` is the upper-case form of its `id` in the data; this is not enforced by code. `[us-state-paths.ts:label: "WY"]`
- `USA_STATE_PATHS` is declared `as const`, so it is readonly at the type level. `US_STATE_TILES` is not frozen. `[us-state-paths.ts:as const]`

## Side Effects

- None. `states.ts` is static data with no imports, environment reads, input or output. `[states.ts:export const US_STATE_TILES]`
- None. `us-state-paths.ts` is static data with no imports, environment reads, input or output. `[us-state-paths.ts:export const USA_STATE_PATHS]`

## Verification

- Run: `npm run test:e2e` (`tests/e2e/home-map.spec.ts` covers the home-page state map, which is drawn from `us-state-paths.ts` and `states.ts`)
- `npm run test:redirects` does not test this directory: `scripts/generate-redirect-map.test.mjs` writes its own stub `src/lib/geo/states.ts` into a temporary folder instead of loading the real file.
