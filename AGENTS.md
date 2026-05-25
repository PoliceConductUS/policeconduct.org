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

Workflow Standards

- This repo uses Codex App, OpenSpec, Superpowers, and the OpenSpec Superpowers bridge for behavior-changing work.
- OpenSpec governs what behavior should exist. Superpowers governs how agents execute the work. The bridge keeps brainstorming, plans, verification, and retrospectives under `openspec/changes/<change-name>/`.
- Behavior changes, data-shape changes, seed/migration changes, validation changes, and downstream contract changes should use an isolated repo-local worktree under `.worktrees/<change-name>`.
- Documentation-only edits, formatting, tooling tweaks, and internal refactors that preserve specified behavior may stay lightweight.
- Use Conventional Commit messages.

OpenSpec Usage

- Run `npm run doctor`, `npm run validate:openspec`, `npx openspec schemas`, and `npx openspec status --change <change-name>` before starting behavior-changing work when practical.
- Brainstorm the outcome before implementation, then turn the result into an OpenSpec change.
- Use `/opsx:continue <change-name>`, `/opsx:apply <change-name>`, `/opsx:verify <change-name>`, and `/opsx:archive <change-name>` for the normal bridge lifecycle.
- Review generated `proposal.md`, `design.md`, `tasks.md`, `plan.md`, `verify.md`, and retrospective artifacts before relying on them.

Change Approval Workflow

- Before making any edits, summarize the exact files and changes you intend to make and wait for explicit user approval. Do not proceed without that approval.
- Do not ask for approval to inspect code, search the repo, or read files. Inspect first, then ask for approval only before making edits.
- Do not preserve backward compatibility unless the user explicitly requests it.
- All architectural compromises must be explicitly explained and approved before implementation. If an implementation weakens, bypasses, or temporarily works around a stated data model, routing invariant, source-of-truth rule, or project convention, stop and get user approval before coding it.

Data + Routing Conventions

- URLs use database-backed slugs. Do not compute slugs during build/runtime.
- Route pages must resolve every URL/path segment from exact database-backed path data. Do not pass route identity through `getStaticPaths()` props, route props, parallel columns, or precomputed convenience fields. `getStaticPaths()` may enumerate valid params from database-backed paths, but the page render must reload the required entity by exact canonical path/slug and fail loudly if it is missing or the wrong entity type.
- Do not generate IDs for database entities anywhere in the website, build scripts, seed data, or runtime code. Database entity IDs must come from explicit database or seed data values only.
- Agency location identity must come from `public.agency.location_path_id` joined to `public.location_path`. Do not reconstruct agency location, agency canonical URLs, or agency route parameters from parallel agency columns, derived slugs, `build_page_payload.path`, or generated path logic.
- Seed data and data-loading code must use one authoritative representation for each fact or relationship. Keep required parent/reference identity in the same seed row whenever the table has that relationship column. Do not create parallel source-of-truth structures, derived relationship lists, split seed maps, or other drift-prone implementations unless the user has explicitly approved the architectural compromise.
- Civil case geography has two distinct scopes. `public.civil_cases.location_path_id` is the incident-location geography and may be used only for geographic rollups where one case rolls up once by incident location. Agency, personnel, and federal civil-case scopes must use linked records through `public.civil_case_officers -> public.agency_officers -> public.agency -> public.location_path`; these relationship views may show the same case under multiple connected agencies or personnel. Pages must label which civil-case scope they use and must not mix incident-location metrics with agency/personnel-linked rows.
- Report URLs must use slug: /report/{slug}/.
- Agency canonical URLs use the joined location path plus the agency slug.
- Pagination URLs use /page/{number}/; page 1 is the base path with no /page/1/.

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
- Prefer non-null assertions (e.g., agency.name!) when the field is required by schema.
- Personnel profile images use a static mapping by id in src/lib/personnel-images.ts and fall back to /img/personnel/default.webp.

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

Validation Expectations

- `npm run validate` is the aggregate validation gate for baseline-clean checks.
- Run narrower checks during development when faster feedback is useful, but do not claim completion until relevant validation has actually run.
- If validation cannot run because of missing local services, credentials, or external state, report that limitation explicitly.

Legal Notices

- Any new legal notice must be added to both the footer list in src/layouts/SiteLayout.astro and the Legal Notices list in src/pages/legal-notice/index.astro.
- Footer legal notices must remain in lexical order.
