# Form Types (`src/lib/forms`)

## Overview

Shared TypeScript types for form prefill payloads. The directory holds one file, `prefill.ts`, which is a type declaration with no runtime code.

## Interface

- `ReportNewPrefill` is an exported type: an object with one optional property `officer`, itself an object with an optional string `name` and an optional string `department`. `[prefill.ts:ReportNewPrefill]`

## Invariants

- Both `officer` fields are optional strings; nothing is validated at runtime because the file emits no code. `[prefill.ts:department?: string]`

## Side Effects

- None. The file has no imports and no runtime behaviour. `[prefill.ts:name?: string]`

## Verification

- Run: `npm test` (no test group in `package.json` names a file in this directory)
