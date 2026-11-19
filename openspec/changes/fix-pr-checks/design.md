# Design

## Decisions

- Jump controls parse the selected value with `new URL(value, location.href)` and navigate only when the protocol is `http:` or `https:`. Any other value does nothing: no navigation and no status message.
- The robots check parses each `Sitemap:` line and compares the URL, lowercased, with `https://www.policeconduct.org/sitemap-index.xml`. No RegExp is built from the host.
- `.github/workflows/deploy-preview.yml` is deleted. Previews and releases are published locally with `npm run deploy -- <environment>` (`scripts/deploy.sh`, which calls `scripts/upload-release.sh`). No GitHub workflow builds or publishes a preview or a release until a change adds CI publication. The CI publication tasks in `atomic-sha-deploys` stay deferred.
- `.github/workflows/cleanup-preview.yml` stays. A preview published with `PR_NUMBER` uses the host label `pr-<N>` (`scripts/deploy.sh`), and the workflow removes that `current:pr-<N>` selection when the PR closes. Known limit: a preview published with `PREVIEW_NAME` is never removed automatically.
- Copilot Setup Steps installs dependencies and browsers only.

## Alternatives Considered

- **Same-origin jump destinations.** This is stricter, because it also blocks links to other sites. It was not chosen: the CodeQL findings were about script execution, and http(s) closes that. Option values are server-rendered, site-relative paths, so both rules accept every real option.
- **Escaping the host into a RegExp.** Tried on 46732fc. CodeQL still flagged it, so it was replaced with a direct comparison.
- **Keeping the preview workflow with `workflow_dispatch` only.** It was not chosen. CI has no database or intake data, so the workflow cannot build the site, and local `npm run deploy -- preview` already publishes previews.

## Risks & Mitigations

- A rejected jump value fails silently. Real options are server-rendered, so only a changed page can hit this path.
- The robots check lowercases the path as well as the host, so `/SITEMAP-INDEX.XML` would pass. `public/robots.txt` is a static file in the repo, so a review of that file catches a wrong case.
- The jump regression test needs the intake database and runs only locally. CodeQL is the only CI coverage.
