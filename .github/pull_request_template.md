## Change

Describe the concrete problem, final behavior, and scope.

## Merge evidence

Follow [the complete merge checklist](../README.md#pr-merge-checklist).

- Final head SHA:
- mise runtime versions; `npm ci` and installed-versus-lockfile comparison:
- Full `npm run validate` command, exit code, and complete log:
- Stage outcomes: Prettier; JavaScript/SQL lint; Astro/types; shell; schema;
  OpenSpec; personal-data scan:
- Suite passed/failed/skipped counts: redirects; media; Lambda; CSS;
  personal-data; coverage; browsers (including built-index Pagefind):
- Errors/warnings fixed; individual hint dispositions:
- Skips and explicit human exception links (reason, check, scope, duration):
- Task-specific browser/build/no-inline-CSS checks:
- Actual CI status and links for the final SHA:
- Final diff inspected; unrelated changes preserved:
- Remaining blockers and required human decisions:

An exit-zero command with unresolved warnings is not merge-ready. Scoped checks
are not full validation. No warning/coverage exception exists without an explicit
recorded human decision. Review, merge, deployment, and public release remain
separate gates; report deployed only with deployed evidence.
