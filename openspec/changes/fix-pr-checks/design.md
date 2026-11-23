# Design

## Goals / Non-Goals

- Goals: CodeQL reports no alert in the three fixed files; Copilot Setup Steps installs tools without building; no GitHub workflow builds or publishes the site.
- Non-goals: no CI build or publication until a change adds it (owner decision Q35); no CI run of the database-backed tests.

## Decisions

- Jump controls parse the selected value with `new URL(value, location.href)` and navigate only when the protocol is `http:` or `https:`. Any other value does nothing: no navigation and no status message.
- The robots check parses each `Sitemap:` line and compares the URL, lowercased, with `https://www.policeconduct.org/sitemap-index.xml`. No RegExp is built from the host.
- The robots check lives in `scripts/audit-seo-checks.mjs`, which has no side effects on import, so a test can load it. `scripts/audit-seo.mjs` runs its audit on import and imports the check from that module, as `audit-a11y.mjs` does with `audit-a11y-checks.mjs`.
- `.github/workflows/deploy-preview.yml` is deleted. Previews and releases are published locally with `npm run deploy -- <environment>` (`scripts/deploy.sh`, which calls `scripts/upload-release.sh`). No GitHub workflow builds or publishes a preview or a release until a change adds CI publication. The CI publication items under "Deferred until a change adds CI publication" in `atomic-sha-deploys/tasks.md` stay deferred.
- `.github/workflows/cleanup-preview.yml` stays. A preview published with `PR_NUMBER` uses the host label `pr-<N>` (`scripts/deploy.sh`), and the workflow deletes that preview's `current:pr-<N>` pointer (the CloudFront KeyValueStore key that maps the host to a build folder) when the PR closes. Today `scripts/deploy.sh` also accepts `PREVIEW_NAME`, which wins over `PR_NUMBER`; such a build is not cleaned up when the PR closes. `atomic-sha-deploys` task 3.1 removes `PREVIEW_NAME`. Task 2.2 here and `atomic-sha-deploys` task 4.1 both edit `cleanup-preview.yml`; 2.2 changes only a comment.
- Copilot Setup Steps installs dependencies and browsers only.

## Alternatives Considered

- **Same-origin jump destinations.** This is stricter, because it also blocks links to other sites. It was not chosen: the CodeQL findings were about script execution, and http(s) closes that. Option values are server-rendered, site-relative paths, so both rules accept every real option.
- **Escaping the host into a RegExp.** Tried on 46732fc. CodeQL still flagged it, so it was replaced with a direct comparison.
- **Keeping the preview workflow with `workflow_dispatch` only.** It was not chosen. CI has no database or intake data, so the workflow cannot build the site, and local `npm run deploy -- preview` already publishes previews.

## Risks & Mitigations

- A rejected jump value fails silently. Real options are server-rendered, so only a changed page can hit this path.
- A value that `new URL` cannot parse, such as `http://[`, throws after the submit is cancelled. Nothing opens, which matches the spec, but the browser logs an uncaught error. Only a changed page can hit this path.
- The jump test does not assert that the page stays put or that the status region stays empty after a rejected value.
- The robots check lowercases the path as well as the host, so `/SITEMAP-INDEX.XML` would pass. No automated check catches a wrong-case path. `public/robots.txt` is static and changes only through a reviewed commit.
- The jump regression test needs the intake database and runs only locally. CodeQL is the only CI coverage.
