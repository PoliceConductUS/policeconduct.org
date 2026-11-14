# Home Introduction Video Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement
> this plan task-by-task.

**Goal:** Play the published introduction on the home page.

**Architecture:** Add one section in the existing Astro page. Reuse the existing
video URL helper and Bootstrap layout without introducing a new component.

**Tech Stack:** Astro, TypeScript, Bootstrap, YouTube iframe.

**Spec:** `specs/home-introduction-video/spec.md` and `design.md` in this change.

## Global Constraints

- Reuse the current worktree and branch.
- Do not change existing sections or introduce new CSS, dependencies, or routes.
- Use the actual published YouTube URL; do not fabricate a video ID.
- Required validation must use the configured Node 24 runtime and locked packages.

## Review Focus

Check actual embed identity, section order, mobile width, iframe accessibility,
and generated HTML without inline CSS in one desktop/mobile inspection pass.

## Task 1: Home-page introduction

**Files:** Modify `src/pages/index.astro`; maintain this change's artifacts.

- [x] **Step 1:** Inspect the existing home page and shared video/layout patterns.
- [x] **Step 2:** Import `getVideoEmbedUrl` and add the section after the hero,
      using the actual published URL, shared H2, introductory sentence, and a
      lazy-loaded accessible fullscreen iframe in `ratio ratio-16x9`.
- [x] **Step 3:** Render and inspect desktop/mobile placement, title, 16:9 sizing,
      keyboard focus, no autoplay, and absence of inline CSS.
- [x] **Step 4:** Run `npm run validate` in full, verify installed package versions
      against lockfiles, and run required built/served Pagefind coverage.
- [x] **Step 5:** Record exact validation outcomes and return the diff for
      independent review. Leave commit and push to the coordinating agent.
