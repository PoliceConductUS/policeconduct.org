AGENTS.md

Purpose

- This file captures project-specific standards for Codex agents working in this repo.

Project Goal

- PoliceConduct.org helps residents evaluate whether law-enforcement agencies and the people working there appear safe, accountable, transparent, and improving.
- Part of that goal is identifying positive deviance: agencies, officers, supervisors, units, policies, practices, and community workflows that produce unusually good public-trust and public-safety outcomes under comparable constraints.
- Agents should look for what is working unusually well, not only failures, misconduct, lawsuits, or weak policies. Positive findings must be evidence-backed, clearly scoped, and never presented as unsupported praise or overall endorsement.
- Positive-deviance analysis should follow an asset-based, community-informed workflow: define the problem and desired outcome, determine whether positive deviants exist, discover uncommon successful practices, develop ways to share or test those practices, and discern results through monitoring and revision.

Change Approval Workflow

- Before making any edits, summarize the exact files and changes you intend to make and wait for explicit user approval. Do not proceed without that approval.
- Do not ask for approval to inspect code, search the repo, or read files. Inspect first, then ask for approval only before making edits.
- Do not preserve backward compatibility unless the user explicitly requests it.

Data + Routing Conventions

- URLs use database-backed slugs. Do not compute slugs during build/runtime.
- Report URLs must use slug: /report/{slug}/.
- Agency URLs use a category segment stored in the DB: /law-enforcement-agency/{category}/{slug}/.
- Agency category rules:
  - category is stored in public.agency.category.
  - federal agencies use category = "federal".
  - non-federal agencies use category = lower(state) for now.
- Pagination URLs use /page/{number}/; page 1 is the base path with no /page/1/.

Database Expectations

- Agencies, personnel, and reports must have unique, required slug fields in the database.
- Agency category is required in the database.
- Seed data must populate slugs and category when seeding.
- seed.sql must be fully deterministic: every row must include explicit ids and slugs, with no triggers, generated slugs, or runtime ID generators (e.g., generate_cuid). Rerunning seed.sql must yield identical data and identifiers.
- When adding federal agencies, keep the hash in the slug for consistency and safety.
- If a migration adds a required DB field, update seed.sql in the Supabase repo.
- Missing expected database tables or fields must fail the build. Do not add silent fallbacks, empty results, or missing-schema guards for required data.

Templates (Critical Fields)

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

Legal Notices

- Any new legal notice must be added to both the footer list in src/layouts/SiteLayout.astro and the Legal Notices list in src/pages/legal-notice/index.astro.
- Footer legal notices must remain in lexical order.
