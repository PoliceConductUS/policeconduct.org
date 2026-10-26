AGENTS.md

Purpose

- This file captures project-specific standards for Codex agents working in this repo.

Project Goal

- PoliceConduct.org helps residents evaluate whether law-enforcement agencies and the people working there appear safe, accountable, transparent, and improving.
- Part of that goal is identifying positive deviance: agencies, officers, supervisors, units, policies, practices, and community workflows that produce unusually good public-trust and public-safety outcomes under comparable constraints.
- Agents should look for what is working unusually well, not only failures, misconduct, lawsuits, or weak policies. Positive findings must be evidence-backed, clearly scoped, and never presented as unsupported praise or overall endorsement.
- Positive-deviance analysis should follow an asset-based, community-informed workflow: define the problem and desired outcome, determine whether positive deviants exist, discover uncommon successful practices, develop ways to share or test those practices, and discern results through monitoring and revision.

Prime Directive

- Build the smallest correct thing that produces the intended outcome.
- Start outside-in: define the observable user, community, data, or system outcome before choosing an implementation.
- Avoid hidden product decisions. If a requirement is unclear, either inspect existing repo context or ask before encoding a new policy.

This Repository Is Public

- Everything committed here is world-readable the moment it is pushed, and permanently readable by anyone who forked it. History rewriting does not undo that: a third-party fork retains every blob, and `main` blocks force-pushes. Read `docs/third-party-personal-data.md` before committing anything that mentions a person or a filesystem path.
- Personal information that a third party gave us — volunteers, tipsters, applicants, correspondents, donors, members of the public — must never be committed to this repository, in any file, in any form, including comments, fixtures, tests, and commit messages. It goes in the database behind the personnel publication gate. A scanner cannot enforce this, because a volunteer's name and email are textually identical to the public-official contacts that legitimately belong in our corpus. You have to not do it.
- Public-official contact data is different. Agency contact names, work emails, and published phone numbers for officials acting in their official capacity are sourced corpus data and belong in the database and on the site.
- Never commit absolute home directory paths (`/Users/<name>/`, `/home/<name>/`, or the Windows user-profile equivalent), cloud-storage account folders, machine-local files (`*.local.*`), environment files, or credential material. Use repo-relative paths. Agent temp-directory slugs encode the home path too — strip them.
- `npm run scan:personal-data` runs the gate locally. `.github/workflows/personal-data-scan.yml` runs it on every pull request and is the enforcing gate. Do not bypass it with `git commit --no-verify`, and do not loosen a rule to get a change through; any legitimate scanner exception requires the explicit, scoped human decision described below before adding a reviewed, dated `ALLOWLIST` entry in `scripts/scan-personal-data.mjs`.
- If you believe something personal has already been pushed, stop and escalate. Do not delete, amend, or rewrite it first — the remediation path depends on what is already mirrored.

Workflow Standards

- This repo uses Codex App, OpenSpec, Superpowers, and the OpenSpec Superpowers bridge for behavior-changing work.
- OpenSpec governs what behavior should exist. Superpowers governs how agents execute the work. The bridge keeps brainstorming, plans, verification, and retrospectives under `openspec/changes/<change-name>/`.
- Only one worktree and branch may be active for this repo at a time. Reuse the current worktree and branch for new work. Never create another worktree or branch without the user's explicit permission, even when isolation would otherwise be preferred.
- Behavior changes, data-shape changes, seed/migration changes, validation changes, and downstream contract changes should use the active repo-local worktree under `.worktrees/<change-name>`; do not create a new one without the user's explicit permission.
- Documentation-only edits, formatting, tooling tweaks, and internal refactors that preserve specified behavior may stay lightweight.
- Use Conventional Commit messages.

Design Standards

- Before frontend, visual, layout, typography, component, or copy changes, read `.impeccable.md` and `DESIGN.md`.
- `DESIGN.md` is the canonical design system standard. Do not invent page-local typography, heading, spacing, color, or component rules when a shared rule exists.
- Public-facing copy must target an 8th-grade reading level. A 10th-grade reading level is acceptable only when precision requires it.
- Replace technical, legal, and data-analysis terms in public labels with familiar wording. A tooltip, definition, or detail-page explanation may show the original source/legal term when needed, but the visible label must remain familiar.
- H1/H2/H3 styling must come from shared typography tokens/classes. Do not use Bootstrap `display-*` classes or page-local heading CSS to change semantic heading size or font family.
- One heading level means one visual role across pages. If a compact panel cannot visually support an H2, use a non-heading label or the correct lower heading level rather than styling H2 differently.
- Generated HTML must not contain inline CSS. Keep `astro.config.mjs` `build.inlineStylesheets` set to `"never"`, do not add `style` attributes, and ensure component/page CSS ships through external stylesheets only. `npm run build` enforces this with `npm run validate:no-inline-css`.

OpenSpec Usage

- Run `npm run doctor`, `npm run validate:openspec`, `npx openspec schemas`, and `npx openspec status --change <change-name>` before starting behavior-changing work when practical.
- Brainstorm the outcome before implementation, then turn the result into an OpenSpec change.
- Use `/opsx:continue <change-name>`, `/opsx:apply <change-name>`, `/opsx:verify <change-name>`, and `/opsx:archive <change-name>` for the normal bridge lifecycle.
- Review generated `proposal.md`, `design.md`, `tasks.md`, `plan.md`, `verify.md`, and retrospective artifacts before relying on them.

Change Approval Workflow

- When the user directly requests a fix or implementation, that request is approval to make the necessary scoped edits. Do not stop for a second approval round unless the change introduces an architectural compromise, weakens an invariant, changes data semantics, touches unrelated behavior, or has materially risky/ambiguous scope.
- When proposing optional work, broad cleanup, or a change the user has not directly requested, summarize the exact files and changes you intend to make and wait for explicit user approval before editing.
- Do not ask for approval to inspect code, search the repo, or read files. Inspect first, then ask for approval only before making edits.
- Do not preserve backward compatibility unless the user explicitly requests it.
- All architectural compromises must be explicitly explained and approved before implementation. If an implementation weakens, bypasses, or temporarily works around a stated data model, routing invariant, source-of-truth rule, or project convention, stop and get user approval before coding it.

Data + Routing Conventions

- URLs use database-backed slugs. Do not compute slugs during build/runtime.
- Route pages must resolve every URL/path segment from exact database-backed path data. Do not pass route identity through `getStaticPaths()` props, route props, parallel columns, or precomputed convenience fields. `getStaticPaths()` may enumerate valid params from database-backed paths, but the page render must reload the required entity by exact canonical path/slug and fail loudly if it is missing or the wrong entity type.
- Do not generate IDs for database entities anywhere in the website, build scripts, seed data, or runtime code. Database entity IDs must come from explicit database or seed data values only.
- Agency location identity must come from `public.agency.location_path_id` joined to `public.location_path`. Do not reconstruct agency location, agency canonical URLs, or agency route parameters from parallel agency columns, derived slugs, `build_page_payload.path`, or generated path logic.
- Seed data and data-loading code must use one authoritative representation for each fact or relationship. Keep required parent/reference identity in the same seed row whenever the table has that relationship column. Do not create parallel source-of-truth structures, derived relationship lists, split seed maps, or other drift-prone implementations unless the user has explicitly approved the architectural compromise.
- Location-scoped reports and policy context must render only for the exact `location_path_id` they are attached to. Do not inherit, roll up, or cascade `location_reports` or similar location-scoped report records to child or parent locations unless inheritance is explicitly modeled in the database and approved for that report type.
- Civil case geography has two distinct scopes. `public.civil_cases.location_path_id` is the incident-location geography and may be used only for geographic rollups where one case rolls up once by incident location. Agency, personnel, and federal civil-case scopes must use linked records through `public.civil_case_officers -> public.agency_officers -> public.agency -> public.location_path`; these relationship views may show the same case under multiple connected agencies or personnel. Pages must label which civil-case scope they use and must not mix incident-location metrics with agency/personnel-linked rows.
- Report URLs must use slug: /report/{slug}/.
- Public report titles must be clean reader-facing titles. Do not include workflow, provenance, or processing prefixes such as "Processed submitted report:" or "Third-party AI review:" in `reviews.title`; put provenance/disclosure text in the report narrative or a dedicated disclosure field.
- Agency canonical URLs use the joined location path plus the agency slug.
- Pagination URLs use /page/{number}/; page 1 is the base path with no /page/1/.
- `supabase/seed.sql` must insert complete rows directly. Do not add repair, backfill, enrichment, or fix-up blocks that mutate seeded rows after insertion when those values belong in the original `INSERT`. Prohibited seed patterns include `WITH *_seed (...) AS (...) UPDATE public...`, end-of-seed schema enforcement, post-insert required-field population, and split source-of-truth maps for columns already present on the target table. Put required values in the row being inserted and put schema constraints in migrations.

Data Interpretation Standards

- Never draw conclusions from data unless the data directly supports that exact statement.
- Do not present causal claims, intent, motive, targeting, discrimination, safety, accountability, or other interpretive conclusions from descriptive records.
- Prefer descriptive labels, counts, rates, comparisons, cohorts, and methodology notes.
- Any inference must be explicitly labeled as an inference and must identify the direct supporting data and limitations.

Database Expectations

- Agencies, personnel, and reports must have unique, required slug fields in the database.
- Agencies must have a required `location_path_id`.
- seed.sql must be fully deterministic: every row must include explicit ids and slugs, with no triggers, generated slugs, or runtime ID generators (e.g., generate_cuid). Rerunning seed.sql must yield identical data and identifiers.
- When adding federal agencies, keep the hash in the slug for consistency and safety.
- If a migration adds a required DB field, update seed.sql in the Supabase repo.
- Missing expected database tables or fields must fail the build. Do not add silent fallbacks, empty results, or missing-schema guards for required data.

Templates (Critical Fields)

- Never fabricate missing required fields.
- Required DB fields are treated as required in templates.
- Do not use silent fallbacks like "Unknown" or "Not listed" for required fields.
- Templates must not fabricate, explain, or render fallback values for missing data. Required missing data must fail loudly. Optional missing data should be omitted unless the page design explicitly uses an approved neutral empty value such as `--`. Approved visual placeholders are allowed only when they do not claim missing data exists.
- Prefer non-null assertions (e.g., agency.name!) when the field is required by schema.
- Personnel profile images use a static mapping by id in src/lib/personnel-images.ts. The visual default portrait may render when no mapped image exists, but templates must not add explanatory placeholder copy or include the default image as structured data.

Astro + Data Loading

- Use existing loaders in src/lib/data/summaries.ts for list pages.
- Keep sorting rules stable and locale-aware (Intl.Collator).
- No external network calls; use local DB or existing repo data sources only.

General Code Standards

- TypeScript types should be minimal, stable, and shared.
- Keep functions small and testable; avoid duplication by sharing utilities.
- Avoid new dependencies unless already present.
- Never add speculative complexity. Implement only the simplest solution that satisfies the current known requirements, and nothing more.
- Do not add optional abstractions, future-proofing, configurability, or extensibility unless they are required by the current task or explicitly requested by the user.
- Prefer the simplest implementation that could possibly work.
- Do not add boolean behavior flags to components or data models. Prefer explicit component composition, discriminated unions, or separate named components for distinct behavior.

Validation Expectations

- Follow the complete [merge checklist in README.md](README.md#pr-merge-checklist); `package.json` is the source of truth for the gate chain. Run the entire `npm run validate` on the final PR head, even for documentation changes. Scoped checks are development feedback only. Rerun after fixes or head changes.
- Use the repository runtime from `mise.toml` (currently Node 24), run `npm ci`, and verify installed package versions against the lockfile. Never substitute stale shared `node_modules`.
- Fix every error and warning, including pre-existing findings. Exit zero is not merge readiness. Calling a finding harmless, advisory, baseline, or out of scope does not waive it. Inspect diagnostic hints and resolve or explicitly justify each one; tool labels alone are not justification.
- Do not disable rules, add ignores, weaken assertions, hide diagnostics, skip tests, or alter fixtures merely to get green output. Fix underlying causes. Fixture corrections must preserve the behavior and assertions being tested, including required form fields and qualifying record relationships.
- Missing configuration, services, data, browsers, or generated assets block verification. Set up the intended environment safely; do not modify production data or publish personnel to satisfy checks. Never commit credentials, absolute home paths, or private data.
- Account for every skipped test. Required coverage must run in the correct environment, including built and served Pagefind search. A skipped behavior did not pass. Any warning or coverage exception needs a linked, explicit human decision stating reason, affected check, scope, and duration. Silence or acknowledgment of a limitation is not permission.
- Record final commit SHA, runtime and dependency verification, command, exit code, each stage outcome, test counts, warning/hint dispositions, skip accounting, task-specific checks, and actual CI status for that head. Inspect the final diff and preserve unrelated changes. PR descriptions and completion reports must reflect final scope and evidence.
- Merge readiness, human-reviewed merge, deployment, and public release are separate states. Use feature branches and PRs only. Retain production-release and personnel-publication approval gates. Never claim deployment without deployed evidence.

Legal Notices

- Any new legal notice must be added to both the footer list in src/layouts/SiteLayout.astro and the Legal Notices list in src/pages/legal-notice/index.astro.
- Footer legal notices must remain in lexical order.
