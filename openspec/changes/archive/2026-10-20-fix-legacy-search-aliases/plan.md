# Legacy Static Search Aliases Implementation Plan

> **For agentic workers:** Parent uses superpowers:subagent-driven-development and independent review.

**Goal:** Cover the two exact legacy static URLs in the Search Console export.

**Architecture:** Add literal no-slash source keys to the existing inventory. Preserve all runtime routing behavior.

**Tech Stack:** JavaScript, Node test runner, existing OpenSpec bridge.

**Spec:** specs/legacy-static-search-aliases/spec.md.

## Global Constraints

Use the existing user-authorized worktree. Do not render the website, deploy, merge, or run full validation concurrently with the parent's production build.

## Review Focus

Ensure normalizePath does not append a slash to new source keys; both existing slash variants must remain present exactly once.

## Task 1

Files: scripts/generate-redirect-map.mjs and scripts/generate-redirect-map.test.mjs.

- [x] Add a generator-output regression asserting all four exact paths, their destinations, and status 301.
- [x] Observe failure for missing /privacy-policy source key.
- [x] Add exactly the two missing literal source entries.
- [x] Run node redirect tests, formatting, lint and OpenSpec checks.
- [x] Obtain parent-owned independent review and commit scoped work.
