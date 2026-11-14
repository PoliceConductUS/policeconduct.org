# Verification

Node 24.22.3, dependencies installed with `npm ci --no-audit --no-fund`; `npm ls --depth=0` exits zero. Eight focused tests pass with zero skips, including execution of the exact Terraform program with JSON stdin and a mock rejecting non-GET requests. Explicit apply preserves enabled tracking and a custom host; missing-domain creation does not PATCH or verify. The CLI test resolves its mock import to an absolute path to support the repository's relative TMPDIR.

OpenSpec validation: 39 items passed. Full `npm run validate` is required before merge; see the task report for its current result. Doctor reports missing Homebrew dependencies, GitHub CLI authentication and Docker runtime. No merge readiness is claimed.

All four authoritative nameservers agree on existing Google root MX, `mail` receiving MX (`10 receive.forge.rmta.net.`), `send.mail` MX/SPF, and DKIM TXT. `links.mail.policeconduct.org` returns authoritative NXDOMAIN. DNS existence alone does not establish Resend verification. Authenticated Resend readback confirms tracking CNAME links.mail.policeconduct.org to links1.resend-dns.com, click tracking enabled, open tracking disabled, and receiving pending. No provider mutations, Terraform apply, paid services, or deployment performed.

Tracking inclusion regression passes with the existing seven other tests (8 passed, zero skips). AWS state/plan reconciliation remains unverified; no manual DNS change is authorized by this runbook.

## DNS ownership protection follow-up

The bootstrap now explicitly disables creation overwrite for Resend, ACM, preview wildcard, and extra records. A fresh full plan shows 15 DNS instances changing only `allow_overwrite` from true to false; names, values, TTLs, aliases, and routing remain unchanged. Other planned changes remain three additions and three updates. Terraform format and validation pass, as do all 40 OpenSpec checks. Execution and final validation status are recorded in the task audit; this source change does not establish full synchronization.

The earlier NXDOMAIN/provider-pending observations above are historical. Tracking was subsequently applied through Terraform and verified with authoritative DNS and Resend; see the task audit for the dated evidence.
