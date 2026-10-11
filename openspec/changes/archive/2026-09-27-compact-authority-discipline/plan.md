# Compact authority discipline plan

Use subagent-driven-development in the existing redesign-civic-index-pages worktree. User approval is the preceding critique approval; no second approval round is needed.

Spec: specs/authority-discipline-browsing/spec.md

## Task 1: Compact browsing

Implement tests first in tests/e2e/licensing-authority\*.spec.ts, observe a real failure, then modify src/components/LicensingAuthorityRecords.astro and add scoped styles/client code only if useful. Keep ten records visible with local pagination buttons, full-list search, live result count, native details, visible supplied source links and conditional section links. Preserve existing tests' semantic coverage; update assertions only where changed visibility requires searching/paging. No DB mutations, IDs, migrations, routes, dependency additions or unrelated test changes. Do not commit mixed dirty work.

## Task 2: Review and validation

Controller requests independent scoped spec/code review, runs npm run validate, and inspects desktop/mobile using available browser tools or Playwright verification if native browser unavailable. Record failures honestly; never skip or weaken checks to pass. Complete verify and retrospective artifacts.
