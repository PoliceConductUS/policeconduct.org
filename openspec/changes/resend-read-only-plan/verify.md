# Verification

Node 24.22.3, dependencies installed with `npm ci --no-audit --no-fund`; `npm ls --depth=0` exits zero. Eight focused tests pass with zero skips, including execution of the exact Terraform program with JSON stdin and a mock rejecting non-GET requests. Explicit apply preserves enabled tracking and a custom host; missing-domain creation does not PATCH or verify. The CLI test resolves its mock import to an absolute path to support the repository's relative TMPDIR.

OpenSpec validation: 39 items passed. Full `npm run validate` is required before merge; see the task report for its current result. Doctor reports missing Homebrew dependencies, GitHub CLI authentication and Docker runtime. No merge readiness is claimed.

All four authoritative nameservers agree on existing Google root MX, `mail` receiving MX (`10 receive.forge.rmta.net.`), `send.mail` MX/SPF, and DKIM TXT. `links.mail.policeconduct.org` returns authoritative NXDOMAIN. DNS existence alone does not establish Resend verification. Authenticated Resend readback confirms tracking CNAME links.mail.policeconduct.org to links1.resend-dns.com, click tracking enabled, open tracking disabled, and receiving pending. No provider mutations, Terraform apply, paid services, or deployment performed.

Tracking inclusion regression passes with the existing seven other tests (8 passed, zero skips). AWS state/plan reconciliation remains unverified; no manual DNS change is authorized by this runbook.

## DNS ownership protection follow-up

The bootstrap now explicitly disables creation overwrite for Resend, ACM, preview wildcard, and extra records. A fresh full plan shows 15 DNS instances changing only `allow_overwrite` from true to false; names, values, TTLs, aliases, and routing remain unchanged. Other planned changes remain three additions and three updates. Terraform format and validation pass, as do all 40 OpenSpec checks. Execution and final validation status are recorded in the task audit; this source change does not establish full synchronization.

The earlier NXDOMAIN/provider-pending observations above are historical. Tracking was subsequently applied through Terraform and verified with authoritative DNS and Resend; see the task audit for the dated evidence.

## US access restriction rollout

The board approved US allowlists on all five CloudFront distributions and requires this active change to close before PR #45 merges. Terraform declares `whitelist` with only `US` for each distribution. Saved-plan JSON inspection checks every changed resource and attribute. Section1983 has two distribution updates only; Iceconduct has one only; PoliceConduct has two only. Staged plans preserve currently deployed dependencies while certificate, redirect, Lambda and DNS ownership repairs remain pending. No lifecycle ignores were added to source.

All three geo-only applies completed. AWS readback confirms all five distributions are Deployed with whitelist=[US]. Post-apply scoped plans for all three roots report no changes. All three source roots validate. PoliceConduct and section1983 production redirect chains end at HTTP 200; Iceconduct still returns its existing HTTP 301 pending the separate redirect rollout. This verifies provider configuration from the current runtime; no overseas network probe was performed. Rollback is a fresh inspected Terraform plan restoring `restriction_type = "none"` and removing `locations` on the affected distributions. Do not replay a saved pre-apply plan or revert other audit repairs.

Full validation with Node 24.21.0 passed formatting, lint, types, shell, schema, OpenSpec and personal-data checks, then failed because this runtime searched an isolated empty browser cache. A repeat using the existing installed Playwright browser cache reaches browser tests but encounters missing local report routes, including /tx/reports/. This change remains open until full validation and outstanding rollout verification are complete; no merge readiness is claimed.
