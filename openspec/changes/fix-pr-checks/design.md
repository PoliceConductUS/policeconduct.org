# Design

Parse selected jump destinations as URLs and permit only HTTP(S) before navigation. This closes the two reported script-execution paths without changing valid links. Parse sitemap directives and compare their URLs directly with the canonical URL, avoiding dynamic hostname regular expressions.

Remove `.github/workflows/deploy-preview.yml`. Preview builds and publication use the existing local deployment scripts. Copilot setup prepares dependencies and browsers.
