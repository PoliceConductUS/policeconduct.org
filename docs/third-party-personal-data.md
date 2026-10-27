# Personal data and the public repo

`PoliceConductUS/policeconduct.org` is a **public** repository. Everything
committed to it is world-readable from the moment it is pushed, and permanently
readable by anyone who has forked it. History rewriting does not undo that: a
third-party fork retains every blob we have ever pushed, and `main` blocks
force-pushes.

So the only effective control is not committing it in the first place. Two
independent controls enforce that, because one control cannot cover both
failure modes.

## Control A — pattern gate

Machine and account artifacts are mechanically detectable: home directory
paths, cloud-storage account folders (the folder name embeds the account
email), credential shapes, and filenames that are local-only or secret-bearing
by construction.

`scripts/scan-personal-data.mjs` holds the rules. It runs in two places:

- **Pre-commit hook** (`.githooks/pre-commit`) over staged content. Fast local
  feedback. Bypassable with `git commit --no-verify`, and not installed in
  agent runs — so it is a convenience, not the gate.
- **CI** (`.github/workflows/personal-data-scan.yml`) over the pull request's
  diff against its merge base. **This is the real gate.** It is required to
  pass before merge and cannot be skipped from a developer's machine.

The scan covers the **whole content of every file the change touches**, not
just the added lines. A pre-existing finding in a file you are already editing
is yours to clean. "It was already there" is how the tree drifted dirty in the
first place.

### If the gate fires on something legitimate

First obtain an explicit human decision recording the reason, affected check,
scope, and duration, as required by the [merge checklist](../README.md#pr-merge-checklist).
Only then add the approved entry to `ALLOWLIST` in `scripts/scan-personal-data.mjs`. Every entry is
a deliberate, reviewed hole, so each one names the exact path, the exact rule,
and what has to happen for the entry to go away. Allowlist entries are scoped
to a single rule — exempting a file from the filename rule does not exempt its
contents.

Do not bypass the gate with `--no-verify` or by editing the rule to be vaguer.

## Control B — third-party personal information does not go in the repo

This is the rule a pattern gate **cannot** enforce, and it is the one that
matters most.

A volunteer's name, email, and phone number are textually indistinguishable
from the public-official contacts and officer names that legitimately belong in
our corpus. `dmiller@cityofirving.org` appears on `main` by design. No scanner
can separate the two, and a generic PII detector over a corpus _made of_ names
produces a gate nobody can keep green. The check has to be structural instead
of textual.

**The rule:** personal information that a third party gave us — volunteers,
tipsters, applicants, correspondents, donors, members of the public — must not
live in this repository in any form. Not in a doc, not in a fixture, not in a
test, not in a comment, not in a commit message.

That applies regardless of how harmless the field looks, and regardless of
whether the person would mind. The repo is the wrong container for it: it has
no access control, no retention policy, no correction path, and no audit trail.

Enforced as a path deny-rule. New files under these directory names fail CI:

```
volunteer-packets/  volunteers/  submissions/  applicants/
donors/             tips/        contact-forms/
```

The deny-rule is a tripwire, not the rule. Putting a volunteer's email in
`docs/notes.md` violates Control B just as much — it simply is not mechanically
catchable, which is why this document exists and why it is linked from
`AGENTS.md`.

### Where third-party personal information goes instead

- **Volunteer, tipster, and correspondent details:** the intake database,
  behind the personnel publication gate. Not the repo.
- **Public submissions through the site:** the existing forms API
  (`infrastructure/bootstrap-policeconduct/lambdas/forms-api`), which writes to
  the submissions account. Not the repo.
- **Records-request correspondence with a named private individual:** the
  records workspace outside this checkout. Reference it by request identifier,
  not by pasting the correspondence.
- **A document that genuinely needs publishing** (an outreach template, a
  volunteer packet, a records-request guide): strip it to the template. It must
  name no private individual. Published copies live in `public/downloads/`,
  which is deliberately public — that is a publication decision, reviewed as
  one, not a convenient place to park a file.

When you are unsure whether something counts as third-party personal
information, it does. Route it to the database and ask.

## Public-official contact data is different

Agency contact names, work emails, and published phone numbers for public
officials acting in their official capacity are corpus data. They are sourced,
carry provenance, and belong in the database and on the site. Control B is
about information a private individual handed us, not about the public record
we are built to publish.

## Scope limits

This repository is one container. These controls do not cover the private
repos, the intake checkouts, the AWS accounts, or the records workspace. They
also do not retroactively protect anything already pushed — see INS-29 for what
that costs.

## Related

- INS-29 — the incident. Two files sat world-readable for ~3 months.
- INS-65 — these controls.
