# Fix PR checks

## Why

PR #3 fails preview deployment because its AWS configuration does not match the existing preview environment. Copilot setup runs an invalid npm command. CodeQL identifies executable jump URLs and incomplete hostname escaping.

## What Changes

- Restrict jump-control navigation to HTTP(S) URLs in the site and mockup.
- Correct literal hostname escaping in the SEO audit.
- Connect preview automation to the existing environment configuration and identify the missing intake dump prerequisite.
- Make Copilot's dependency/browser setup complete successfully without treating environment setup as a database-backed release build.

## Impact

Existing valid navigation and hostname checks remain supported. Preview builds continue to require real intake data; required-schema checks remain strict. Database dump provisioning remains pending confirmation of its intended storage location.
