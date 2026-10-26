import { expect, test } from "@playwright/test";
import { incomeRows } from "../../src/lib/data/arrest-income.js";

const evidence = (entries: [string, number | null, number][]) => ({
  cells: entries.map(([month, estimate, arrests], index) => ({
    month,
    incomeTract: String(index),
    incomeStatus: estimate === null ? "geocoder_no_match" : "matched",
    arrests,
  })),
  residential_income_by_tract: Object.fromEntries(
    entries.map(([, estimate], index) => [String(index), { estimate }]),
  ),
});
test("income ranges preserve boundaries, unknown arrests, and same-period agency counts", () => {
  const own = evidence([
    ["2024-01", 24999, 1],
    ["2024-01", 25000, 2],
    ["2024-02", 50000, 3],
    ["2024-02", 75000, 4],
    ["2024-02", 100000, 5],
    ["2024-02", 150000, 6],
    ["2024-02", null, 7],
  ]);
  const agency = evidence([
    ["2023-12", 25000, 999],
    ["2024-01", 25000, 10],
    ["2024-02", null, 70],
    ["2024-03", null, 999],
  ]);
  const rows = incomeRows(own, agency, "2024-01", "2024-02");
  expect(rows.map((r) => r.count)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(rows.map((r) => r.agencyCount)).toEqual([0, 10, 0, 0, 0, 0, 70]);
  expect(rows.at(-1)?.label).toBe("Unknown");
});
test("matched income without its estimate fails instead of becoming Unknown", () => {
  const bad = evidence([["2024-01", 25000, 1]]);
  bad.residential_income_by_tract = {};
  expect(() => incomeRows(bad, bad, "2024-01", "2024-01")).toThrow(/income/);
});

test("income table uses approved headings and accurate percentages on desktop and mobile", async ({
  page,
}) => {
  const { readFile, mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const { transform } = await import("@astrojs/compiler-rs");
  const { default: ts } = await import("typescript");
  const { experimental_AstroContainer } = await import("astro/container");
  const source = await readFile(
    "src/components/PersonnelArrestProfiles.astro",
    "utf8",
  );
  const compiled = transform(source, {
    internalURL: import.meta.resolve("astro/compiler-runtime"),
    resolvePath: (specifier) =>
      specifier.startsWith("#src/")
        ? new URL(`../../src/${specifier.slice(5)}`, import.meta.url).href
        : specifier,
  });
  const directory = await mkdtemp(join(tmpdir(), "income-render-"));
  try {
    const path = join(directory, "component.mjs");
    await writeFile(
      path,
      ts.transpile(
        compiled.code
          .replace(/(["'])#src\/([^"']+)\1/g, (_match, _quote, path) =>
            JSON.stringify(new URL(`../../src/${path}`, import.meta.url).href),
          )
          .replace(/^import "<stdin>\?astro&type=style[^"\n]*";$/gm, ""),
        { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
      ),
    );
    const { default: component } = await import(pathToFileURL(path).href);
    const container = await experimental_AstroContainer.create();
    const own = evidence([
      ["2024-01", 25000, 100],
      ["2024-01", null, 270],
    ]);
    const agency = evidence([
      ["2024-01", 25000, 2500],
      ["2024-01", null, 540],
    ]);
    const html = await container.renderToString(component, {
      props: {
        profiles: [
          {
            id: "example",
            agency: { name: "Example agency", href: "/example/" },
            updatedAt: "2024-02-01",
            coverage: {
              source: "Example records",
              firstMonth: "2024-01",
              lastMonth: "2024-01",
              totalArrests: 370,
              chargeRows: 370,
              distinctChargeRecords: 370,
            },
            breakdowns: {
              by_year: { "2024": 370 },
              by_month: { "2024-01": 370 },
              by_iso_week: {},
              by_day_of_week: {},
              by_income_status: { matched: 100, geocoder_no_match: 270 },
              by_beat_status: { matched: 370 },
              by_residential_tract: { "12345678901": 370 },
            },
            incomeRows: incomeRows(own, agency, "2024-01", "2024-01"),
          },
        ],
      },
    });
    await page.setContent(`<style>${compiled.css.join("\n")}</style>${html}`);
    const table = page.locator('[data-breakdown="by_income_range"]');
    await expect(table.locator("thead th")).toHaveText([
      "Estimated household income",
      "Count",
      "Percentage",
      "Agency Percentage",
    ]);
    await expect(table.locator("tbody tr").nth(1).locator("th,td")).toHaveText([
      "$25,000–$49,999",
      "100",
      "27.0%",
      "4.0%",
    ]);
    await expect(table.locator("tbody tr").nth(6).locator("th,td")).toHaveText([
      "Unknown",
      "270",
      "73.0%",
      "50.0%",
    ]);
    await expect(table.locator("tbody tr").last().locator("th,td")).toHaveText([
      "Total",
      "370",
      "100.0%",
      "12.2%",
    ]);
    await expect(page.locator("body")).not.toContainText("geocoder_no_match");
    await expect(
      page.locator(
        '[data-breakdown="by_beat_status"], [data-breakdown="by_residential_tract"]',
      ),
    ).toHaveCount(0);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/arrest-income-${width}.png`,
        fullPage: true,
      });
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});
