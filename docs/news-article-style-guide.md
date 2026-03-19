# News Article Style Guide

This guide describes the voice, structure, and editorial principles for news articles published on PoliceConduct.org. It is intended for anyone drafting or reviewing articles for the site.

---

## Voice and Tone

**Balanced and non-accusatory.** The goal is not to assume wrongdoing but to make a case for documentation and accountability as inherently valuable.

**Explanatory before critical.** When identifying a problem or pattern, explain how it works before criticizing it. Readers should understand the mechanics before the judgment lands.

**Measured and credible.** Avoid charged language, hyperbole, or language that assumes the worst. The credibility of the platform depends on readers trusting that the content is fair-minded.

**Accessible.** Write for a general audience. Avoid legal jargon, acronyms, and insider terminology without explanation. If a legal concept is necessary, define it plainly.

---

## Structure

Articles use a consistent structure:

1. **Lede (in the hero section)** — A one- or two-sentence summary of what the article is about. Should orient the reader without giving everything away.

2. **Opening paragraphs** — Establish the context and the article's purpose. End this section with a clear statement of what the article is arguing or explaining.

3. **Sectioned body** — Use `<h2>` subheads (styled as `.h4 .text-uppercase .text-muted`) to break the article into named sections. Each section should address one idea. Typical section count: 4–7.

4. **Closing section** — End constructively. The final paragraphs should point toward what good looks like, what the reader can do, or why the issue matters going forward.

5. **Call to action** — The final paragraph links to PoliceConduct.org.

---

## Paragraphs

- Keep paragraphs short: 2–4 sentences is the norm.
- One idea per paragraph.
- Avoid long compound sentences. Break them up.
- Use a blank line between all paragraphs. Do not use indentation.

---

## Headers

Section headers are brief noun phrases or short questions. They orient the reader to the section's topic without editorializing.

**Good:**

- Why Complaints Get Dismissed
- Existing Records — and Their Limits
- Adding to the Record

**Avoid:**

- Why the System Is Broken
- The Truth About Police Accountability
- What You Need to Know

---

## Lists

Use bullet lists or numbered lists when presenting three or more parallel items (such as enumerated types, steps, or examples). Do not use lists for narrative flow — that belongs in paragraphs.

---

## Acknowledging Counterpoints

Every article should acknowledge the legitimate side of the opposing view before rebutting it. The pattern is:

1. State the opposing point fairly ("On the surface, these responses can seem reasonable.")
2. Introduce the rebuttal ("But in practice...")
3. Support the rebuttal with a concrete example or analogy.

This prevents the article from reading as one-sided and keeps it credible to readers who arrive skeptical.

---

## Analogies and Examples

Use familiar, low-stakes analogies to make abstract points concrete:

- A student disputing a grade
- A homeowner contesting an HOA fine
- A customer leaving a review of a doctor or contractor

Analogies should be situations the reader has likely encountered personally. They should make the point by comparison, not by making the police situation seem trivial.

---

## What to Avoid

- **Inflammatory language.** Words like "corrupt," "cover-up," "lie," or "brutal" should not appear unless they are direct quotes.
- **Overgeneralization.** Do not imply that all officers behave badly or that the entire institution is irredeemable.
- **Legal conclusions.** Do not assert that a specific officer violated the law or committed misconduct. Describe what was reported or documented.
- **Contractions in formal sections.** Contractions (it's, don't, they're) are acceptable in conversational passages but should be avoided in section headers and formal statements.
- **Passive voice to obscure agency.** "Complaints are dismissed" is weaker than "the response often dismisses the complaint." Prefer active constructions.

---

## The Dateline

Every article opens with a dateline in the lede:

> **Dover, Delaware — [Month Day, Year]** — [Opening sentence.]

The dateline is bolded. The city and state are always Dover, Delaware.

---

## Meta Fields

Each article file includes a `newsMeta` export with the following fields:

| Field         | Notes                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `badge`       | `"New"` for published articles; `"Coming Soon"` for placeholders                                         |
| `date`        | ISO format: `YYYY-MM-DD`                                                                                 |
| `description` | 1–2 sentences, 150–160 characters. Used for SEO and article index cards. Should not duplicate the title. |
| `href`        | Must match the file path: `/news/YYYY/MM/DD/slug/`                                                       |
| `title`       | Title case. Should be clear and specific. Avoid vague titles like "An Update" or "Why This Matters."     |

---

## Slug Conventions

Slugs are lowercase, hyphen-separated, derived from the article title. Drop articles (a, an, the) and filler words when they add length without adding meaning.

**Examples:**

- "Why Documenting Police Interactions Helps Everyone" → `why-documenting-police-interactions-helps-everyone`
- "What Happens After You Submit a Report" → `what-happens-after-you-submit-a-report`

The full file path is: `src/pages/news/YYYY/MM/DD/[slug]/index.astro`
