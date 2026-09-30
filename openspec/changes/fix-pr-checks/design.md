# Design

Parse selected jump destinations as URLs and permit only HTTP(S) before navigation. This closes the two reported script-execution paths without changing valid links. Parse sitemap directives and compare their URLs directly with the canonical URL, avoiding dynamic hostname regular expressions.

Use GitHub's existing preview environment and its AWS_ROLE_ARN, S3_BUCKET, and CLOUDFRONT_DIST_ID variables. Inspect the dump prerequisite before modifying deployment storage. Copilot setup prepares dependencies and browsers; the preview workflow retains the full database-backed build.
