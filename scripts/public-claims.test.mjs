import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { build } from "astro";

const root = fileURLToPath(new URL("../", import.meta.url));
const pages = [
  "agency/new",
  "agency/suggest-edit",
  "personnel/new",
  "personnel/suggest-edit",
  "civil-cases/new",
  "civil-cases/suggest-edit",
  "report/new",
  "frequently-asked-questions",
  "donate",
  "volunteer",
  "news/2025/01/19/institute-for-police-conduct-begins-soft-launch",
  "legal-notice/community-guidelines",
  "legal-notice/disclaimer",
  "legal-notice/privacy",
  "legal-notice/comment-policy",
];
const unsupportedClaims =
  /\b(?:verified|verification|fact[- ]check(?:ed|ing)?|(?:manually |automatically )?verify (?:reports|submissions|information|the claim|the submission)|we can verify|reviewed before publication|review every submission|reviewed manually|manual review|keeps the national record accurate|ensure that every piece of data we host is accurate)\b/i;

function assertNoUnsupportedClaims(text, label) {
  const copy = text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/Claims are not independently verified before publication\./g, "")
    .replace(/\bdo not verify (?:submissions|claims)\b/g, "");
  assert.equal(copy.match(unsupportedClaims)?.[0], undefined, label);
}

test("rendered public pages do not promise verification or publication review", async (t) => {
  await mkdir(path.join(root, ".cache"), { recursive: true });
  const fixture = await mkdtemp(path.join(root, ".cache/public-claims-"));
  try {
    for (const page of pages) {
      const directory = path.join(fixture, "src/pages", page);
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, "index.astro"),
        `---
import Page from "#src/pages/${page}/index.astro";
---
<Page />
`,
      );
    }
    await mkdir(path.join(fixture, "src/pages/agency-reports"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture, "src/pages/agency-reports/index.astro"),
      `---
import AgencyReportsPage from "#src/components/AgencyReportsPage.astro";
const report = {
  title: "Example public report",
  canonicalPath: "/example/report/",
};
const data = {
  agencyName: "Example Police Department",
  agencyPath: "/example/agency/",
  administrativeArea: "Example County",
  administrativeAreaSlug: "example-county",
  categoryLabel: "Example State",
  categorySlug: "example-state",
  placeLabel: "Example Place",
  placePath: "/example/place/",
  reportedReports: [report],
};
---
<AgencyReportsPage data={data} currentPage={1} lastPage={1} pageReports={[report]} />
`,
    );
    await mkdir(path.join(fixture, "src/pages/report-disclaimer"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture, "src/pages/report-disclaimer/index.astro"),
      `---
import PageShell from "#src/layouts/PageShell.astro";
import ReportDisclaimer from "#src/components/ReportDisclaimer.astro";
---
<PageShell title="Report disclaimer" heading="Report disclaimer" breadcrumbs={[]}>
  <ReportDisclaimer />
</PageShell>
`,
    );
    await build({
      root: fixture,
      configFile: false,
      site: "https://www.policeconduct.org",
      build: { inlineStylesheets: "never" },
      vite: { resolve: { alias: { "#src": path.join(root, "src") } } },
    });
    for (const page of [...pages, "agency-reports", "report-disclaimer"]) {
      await t.test(page, async () => {
        const html = await readFile(
          path.join(fixture, "dist", page, "index.html"),
          "utf8",
        );
        assert.match(html, /<h1\b/);
        assertNoUnsupportedClaims(html, `${page} visible copy`);
        for (const metadata of html.matchAll(
          /<meta\b[^>]+content="([^"]*)"/g,
        )) {
          assertNoUnsupportedClaims(metadata[1], `${page} metadata`);
        }
        const structuredData = Array.from(
          html.matchAll(
            /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
          ),
          (match) => JSON.parse(match[1]),
        );
        for (const entry of structuredData) {
          assertNoUnsupportedClaims(
            JSON.stringify(entry),
            `${page} structured data`,
          );
        }
        if (page === "frequently-asked-questions") {
          const faq = structuredData.find(
            (entry) => entry["@type"] === "FAQPage",
          );
          assert.ok(faq?.mainEntity.length > 0, "FAQ answers must be rendered");
          for (const question of faq.mainEntity) {
            assert.ok(question.acceptedAnswer.text.length > 0);
          }
        }
        if (page === "agency-reports") {
          assert.match(html, /Example public report/);
        }
        if (page === "report-disclaimer") {
          assert.match(html, /Publication is not an endorsement/);
          assert.match(html, /Allegations are unproven/);
        }
      });
    }
    execFileSync(process.execPath, [
      path.join(root, "scripts/validate-no-inline-css.mjs"),
      path.join(fixture, "dist"),
    ]);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
