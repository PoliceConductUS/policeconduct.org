---
target: licensing-agency pages
total_score: 16
max_score: 32
na_heuristics: 5,9
p0_count: 0
p1_count: 2
target_identity: "file:/Users/dalelotts/dev/PoliceConductUS/policeconduct.org/.worktrees/redesign-civic-index-pages/src/pages/[category]/licensing-authority/index.astro"
target_fingerprint: "sha256:1c79138788feae75f9157facd3a5459d5a71ea004c3c8cf9d489d725fa9eb339"
target_path: /Users/dalelotts/dev/PoliceConductUS/policeconduct.org/.worktrees/redesign-civic-index-pages/src/pages/[category]/licensing-authority/index.astro
timestamp: 2026-09-27T14-21-29Z
slug: src-pages-category-licensing-authority-index-astro
---

Method: dual-agent (A: /root/critique_design · B: /root/critique_detector)

**Verdict:** The sober civic styling fits the product. The discipline section is a record dump where readers need a browsable index. Keep the visual language; change the information structure.

**Documents:** MN POST intake handles document URLs and its acquisition code accounts for multiple documents per case. The current website database has 76 discipline records, all with document_url empty. The page supports at most one source link per record; there is no direct discipline-to-documents collection in the current schema. This does not establish that every record has an underlying document.

**Design health**

| Heuristic         |                  Score | Finding                                              |
| ----------------- | ---------------------: | ---------------------------------------------------- |
| System status     |                      3 | Breadcrumbs work; discipline count/order absent      |
| Familiar language |                      2 | Unexplained SACO                                     |
| User control      |                      2 | Links out, no way to narrow records                  |
| Consistency       |                      3 | Shared shell; discipline departs from compact tables |
| Error prevention  |                    n/a | Read-only surface                                    |
| Recognition       |                      2 | Comparison requires remembering prior entries        |
| Efficiency        |                      1 | No local lookup or pagination                        |
| Minimalism        |                      2 | Repeated labels and spacing                          |
| Error recovery    |                    n/a | No recoverable interaction inspected                 |
| Help              |                      1 | Little contextual terminology help                   |
| **Total**         | **16/32 — Acceptable** | Significant browsing improvements needed             |

**What works:** restrained civic tone; compact license tables; separate allegation/finding/penalty fields and useful personnel links.

**Priority issues**

1. **P1 — All 76 discipline records are expanded.** Repeated labels and section spacing turn a modest collection into a long page. Recommend compact rows showing person, action, date, case and document access, with other details on demand and pagination. Suggested command: $impeccable distill.
2. **P1 — Finding a record requires scrolling.** Add a visible total, ordering cue, and local search by person or case. Pagination alone does not solve lookup. Suggested command: $impeccable shape.
3. **P2 — Verification stops short of the source.** Current data supplies no document URLs. Make supplied documents direct, clearly named links; multiple documents need an explicit data relationship before the website can list them reliably. Suggested command for presentation: $impeccable shape.
4. **P2 — Source terminology is unexplained.** SACO needs a verified plain-language explanation; preserve the original term. Suggested command: $impeccable clarify.
5. **P2 — Mobile makes readers scroll before reaching discipline.** The supplied 844px mobile capture reaches its heading but no records. Add section links near the title; preserve shared heading tokens. Suggested command: $impeccable adapt.

**Cognitive load and journey:** Moderate: chunking, working memory and progressive disclosure fail. Arrival feels calm; lookup becomes laborious; source verification lacks an endpoint. The 76 candidates are sequential, not simultaneous options.

**Persona checks:** A stressed first-time resident must decode SACO; a researcher cannot quickly compare or locate cases; an interrupted mobile reader has difficulty resuming within the expanded list.

**Minor observations:** Source has semantic sections and table headers. Keyboard, focus and contrast were not verified. License records must not be relabeled as unique people.

**Detector:** Zero findings in the route and records component; no false positives. This does not test collection usability.

**Questions:** Keep a compact paginated list here, or recent records plus a separate full-list page? For the next change, focus on list length and lookup, or also terminology and document presentation?
