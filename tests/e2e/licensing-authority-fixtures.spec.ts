import { expect, test } from "@playwright/test";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "@astrojs/compiler-rs";
import ts from "typescript";
import { experimental_AstroContainer } from "astro/container";

const previousTimezone = process.env.TZ;
test.beforeAll(() => {
  process.env.TZ = "America/Los_Angeles";
});
test.afterAll(() => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

const renderRecords = async (props: Record<string, unknown>) => {
  const source = await readFile(
    new URL(
      "../../src/components/LicensingAuthorityRecords.astro",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = transform(source, {
    internalURL: import.meta.resolve("astro/compiler-runtime"),
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
  });
  // Node cannot import Astro's virtual CSS module; include the compiler's CSS
  // in the fixture HTML while the live route exercises external bundling.
  const code = ts.transpile(
    compiled.code.replace(/^import "<stdin>\?astro&type=style[^"\n]*";$/gm, ""),
    {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  );
  const directory = await mkdtemp(join(tmpdir(), "authority-fixture-"));
  try {
    const path = join(directory, "records.mjs");
    await writeFile(path, code);
    const { default: component } = await import(pathToFileURL(path).href);
    const container = await experimental_AstroContainer.create({
      resolve: async (id) => {
        const index = Number(
          new URL(id, "https://fixture.test").searchParams.get("index"),
        );
        const script = compiled.scripts[index];
        if (
          !id.includes("type=script") ||
          script?.type !== "inline" ||
          typeof script.code !== "string"
        )
          throw new Error(`Unexpected fixture asset: ${id}`);
        return `data:text/javascript,${encodeURIComponent(ts.transpile(script.code, { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }))}`;
      },
    });
    return `<style>${compiled.css.join("\n")}</style>${await container.renderToString(component, { props })}`;
  } finally {
    await rm(directory, { recursive: true });
  }
};

test("identity-only authority omits all empty activity sections", async ({
  page,
}) => {
  await page.setContent(
    await renderRecords({ licenses: [], actions: [], discipline: [] }),
  );
  await expect(page.getByRole("heading")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Authority records" }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /Unknown|not available|Education|Training/,
  );
});

test("record summaries and direct discipline retain dates across timezones and source links", async ({
  page,
}) => {
  await page.setContent(
    await renderRecords({
      licenses: [
        { licenseType: "Peace Officer", status: "Active", count: 1200 },
        { licenseType: "Peace Officer", status: null, count: 2 },
      ],
      actions: [
        { action: "Suspended", count: 3, latestDate: "2025-01-02" },
        { action: "Granted", count: 1200, latestDate: null },
      ],
      discipline: [
        {
          id: "discipline-fixture",
          personnelName: "Taylor Example",
          personnelSlug: "taylor-example",
          action: "Reprimand",
          effectiveDate: "2025-01-02",
          expirationDate: "2026-01-02",
          caseNumber: "A-123",
          documentUrl: "https://example.org/order.pdf",
          allegation: "Recorded allegation",
          violation: "Rule 1",
          finding: "Recorded finding",
          chiefAction: "Recorded chief action",
          sanction: "Recorded sanction",
        },
      ],
    }),
  );
  await expect(
    page.getByRole("row", { name: "Peace Officer Active 1,200" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Peace Officer 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Suspended 3 Jan 2, 2025" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Granted 1,200", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Taylor Example" }),
  ).toHaveAttribute("href", "/personnel/taylor-example/");
  await expect(
    page.getByRole("link", { name: "Source document", includeHidden: true }),
  ).toHaveAttribute("href", "https://example.org/order.pdf");
  await expect(
    page.locator('[data-discipline-id="discipline-fixture"]'),
  ).toContainText("Recorded finding");
  await expect(page.locator("body")).not.toContainText("Unknown");
  const nav = page.getByRole("navigation", { name: "Authority records" });
  await expect(nav.getByRole("link")).toHaveCount(3);
  for (const [name, href] of [
    ["Licenses", "#licenses-heading"],
    ["License actions", "#actions-heading"],
    ["Discipline records", "#discipline-heading"],
  ]) {
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      href,
    );
    await expect(page.locator(href)).toBeVisible();
  }
});

test("details and source start collapsed while the summary and allegation remain visible", async ({
  page,
}) => {
  await page.setContent(
    await renderRecords({
      licenses: [],
      actions: [],
      discipline: [
        {
          id: "detailed",
          personnelName: "Taylor Example",
          personnelSlug: "taylor-example",
          action: "Reprimand",
          effectiveDate: "2025-01-02",
          expirationDate: "2026-01-02",
          caseNumber: "A-123",
          documentUrl: "https://example.org/order.pdf",
          allegation: "Recorded allegation",
          violation: "Rule 1",
          finding: "Recorded finding",
          chiefAction: "Recorded chief action",
          sanction: "Recorded sanction",
        },
        {
          id: "minimal",
          personnelName: "Sam Example",
          personnelSlug: "sam-example",
          action: "SACO",
          effectiveDate: null,
          expirationDate: null,
          caseNumber: null,
          documentUrl: null,
          allegation: null,
          violation: null,
          finding: null,
          chiefAction: null,
          sanction: null,
        },
      ],
    }),
  );
  const row = page.locator('[data-discipline-id="detailed"]');
  await expect(
    row.getByRole("link", { name: "Source document", includeHidden: true }),
  ).not.toBeVisible();
  await expect(
    row.getByText("Recorded allegation", { exact: true }),
  ).toBeVisible();
  await expect(row.getByText("A-123", { exact: true })).toBeVisible();
  await expect(row.getByText("Jan 2, 2025", { exact: true })).toBeVisible();
  await expect(
    row.getByText("Recorded finding", { exact: true }),
  ).not.toBeVisible();
  const disclosure = row.locator("summary");
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const source = row.getByRole("link", { name: "Source document" });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("target", "_blank");
  for (const fact of [
    "Jan 2, 2026",
    "Recorded allegation",
    "Rule 1",
    "Recorded finding",
    "Recorded chief action",
    "Recorded sanction",
  ]) {
    await expect(row.getByText(fact, { exact: true })).toBeVisible();
  }
  await page.keyboard.press("Enter");
  await expect(
    row.getByText("Recorded finding", { exact: true }),
  ).not.toBeVisible();
  const minimal = page.locator('[data-discipline-id="minimal"]');
  await expect(minimal.locator("details")).toHaveCount(0);
  await expect(
    minimal.getByRole("link", { name: "Source document" }),
  ).toHaveCount(0);
  await expect(minimal).not.toContainText(
    /Effective date|End date|Case number|Unknown/,
  );
  const nav = page.getByRole("navigation", { name: "Authority records" });
  await expect(nav.getByRole("link")).toHaveCount(1);
  await expect(
    nav.getByRole("link", { name: "Discipline records" }),
  ).toHaveAttribute("href", "#discipline-heading");
});
