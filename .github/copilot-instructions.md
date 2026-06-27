# Copilot Instructions

Read `.impeccable.md`, `DESIGN.md`, and `AGENTS.md` before suggesting frontend or data-routing changes.

## Design Context

PoliceConduct.org is a public-interest records product for residents, defense attorneys, journalists, advocates, civic researchers, and partner organizations. Users may arrive stressed, skeptical, angry, distrustful, urgent, or time-constrained. The interface must help them act and research without spectacle or implementation detail.

Brand personality: credible, courageous, objective.

The UI should feel sober, civic, trustworthy, accountability-oriented, and evidence-backed. Use light-mode-first civic/editorial product design with restrained navy text, thin rules, compact tables, measured spacing, muted teal and deep red accents where useful, and clear hierarchy.

## Design Rules

- Follow `DESIGN.md` for typography tokens, heading scale, spacing, colors, and component vocabulary.
- Use one primary sans family across product/data pages, including the home page.
- H1/H2/H3 styling must come from shared typography tokens/classes.
- Do not use Bootstrap `display-*` classes to change semantic heading size.
- Do not add page-local H1/H2 font-family, font-size, font-weight, line-height, or letter-spacing.
- Avoid gradients, glassmorphism, decorative blobs, neon dashboards, nested cards, generic AI metric walls, and placeholder copy that explains missing data.
- Preserve database-backed routing conventions from `AGENTS.md`.
