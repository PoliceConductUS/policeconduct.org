# types

## Overview

Ambient TypeScript declarations for third-party modules that ship without
types. It holds one file, which declares the `aos` module.

Citations use the form `[file:text]`, where `text` appears verbatim in that file
of this directory.

## Interface

- Ambient module `aos` with a default export `AOS`.
  `[aos.d.ts:declare module "aos"]`
- `AOS.init(options?)`, where options is `Record<string, unknown>`.
  `[aos.d.ts:init: (options?: AosOptions) => void]`
- `AOS.refresh()`. `[aos.d.ts:refresh: () => void]`
- `AOS.refreshHard()`. `[aos.d.ts:refreshHard: () => void]`

## Invariants

- The declaration exposes only `init`, `refresh` and `refreshHard`; any other
  member of the `aos` package is a type error.
  `[aos.d.ts:export default AOS]`

## Side Effects

- None. The file is a type declaration and produces no runtime code.
  `[aos.d.ts:declare module]`

## Verification

- Run: `npm run validate:types` (`astro check` type-checks the declaration;
  `npm test` does not).
