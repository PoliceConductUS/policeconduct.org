# native-domexception

## Overview

A local, dependency-free replacement for the npm package `node-domexception`.
The Forms API Lambda installs it through a `file:` dependency and an `overrides`
entry in `../package.json`, so every transitive dependency that requires
`node-domexception` receives the Node.js built-in `DOMException` instead of the
published polyfill.

Callers: `../package.json` (dependency and override), `../../../main.tf` (the
`archive_file` for the Forms API zip includes `native-domexception/**`),
`../../../scripts/deploy-forms-api.sh` (zips the directory into the deployment
package) and `../dependency-runtime.test.mjs`.

## Interface

- CommonJS module whose single export is the runtime global `DOMException`
  class. [index.cjs:module.exports = globalThis.DOMException]
- Package manifest: name `node-domexception`, version `3.0.0`, `private`, entry
  point `index.cjs`. [package.json:"main": "index.cjs"]

## Invariants

- The package name must stay `node-domexception`; the override in
  `../package.json` resolves by that name. [package.json:"name": "node-domexception"]
- The manifest declares `engines.node` `>=22`. The module has no fallback: it
  exports whatever `globalThis.DOMException` is on the running Node.js. [package.json:"node": ">=22"] [index.cjs:module.exports = globalThis.DOMException]
- The export must be identical to `globalThis.DOMException` (the same object, not
  a subclass or copy). [index.cjs:globalThis.DOMException]

## Side Effects

- None. The module reads one global and performs no I/O. [index.cjs:module.exports = globalThis.DOMException]

## Verification

- Run: `npm run test:lambda` (runs `dependency-runtime.test.mjs`, which asserts
  that `require("node-domexception")` is the built-in `DOMException`).
