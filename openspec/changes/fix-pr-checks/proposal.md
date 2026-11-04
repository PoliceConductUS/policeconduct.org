# Fix PR checks

## Why

PR #3 runs an unfinished automatic preview deployment workflow even though deployments are performed locally. Copilot setup runs an invalid npm command. CodeQL identifies executable jump URLs and incomplete hostname escaping.

## What Changes

- Restrict jump-control navigation to HTTP(S) URLs in the site and mockup.
- Parse sitemap directives and compare their URLs directly to the canonical host.
- Remove the automatic GitHub preview deployment workflow as requested by the user.
- Make Copilot's dependency/browser setup complete successfully without treating environment setup as a database-backed release build.

## Impact

Existing valid navigation and hostname checks remain supported. Preview builds continue to require real intake data; required-schema checks remain strict. Local deployment scripts remain the supported publication path; no GitHub database-dump setup is needed.
