import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";
import type { LocationPagePayload } from "../../src/lib/data/build-payloads";

const locations = new Map<string, LocationPagePayload>();

test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"]) {
    dotenv.config({ path, override: true, quiet: true });
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const paths = ["/tx/", "/tx/dallas-county/", "/tx/dallas-county/irving/"];
    const { rows } = await client.query<{
      path: string;
      payload: LocationPagePayload;
    }>(
      "select path, payload from public.build_page_payload where page_type = 'location' and path = any($1)",
      [paths],
    );
    expect(rows.map((row) => row.path).sort()).toEqual([...paths].sort());
    for (const row of rows) locations.set(row.path, row.payload);
  } finally {
    await client.end();
  }
});

const expectBreadcrumbs = async (
  page: Page,
  expected: { href?: string; label: string }[],
) => {
  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  const items = await breadcrumbs.getByRole("listitem").evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.querySelector("a")?.getAttribute("href") || null,
      label: node.textContent?.trim() || "",
    })),
  );

  expect(items).toEqual(
    expected.map((item) => ({
      href: item.href ?? null,
      label: item.label,
    })),
  );
};

const statCell = (page: Page, regionName: string | RegExp, label: string) =>
  page
    .getByRole("region", { name: regionName })
    .locator(".stat-cell")
    .filter({ has: page.getByText(label, { exact: true }) });

const expectStatValue = async (
  page: Page,
  regionName: string | RegExp,
  label: string,
  expectedValue: string | RegExp,
) => {
  const cell = statCell(page, regionName, label);
  await expect(cell).toHaveCount(1);
  await expect(cell.locator(".ledger-value")).toHaveText(expectedValue);
};

const expectNoOldSurfaces = async (page: Page) => {
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByPlaceholder("Search this index")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Reports by month" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Look deeper by topic" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Police contact and enforcement activity",
    }),
  ).toHaveCount(0);
  await expect(page.locator(".metric-value")).toHaveCount(0);
  await expect(page.locator(".sample-chart")).toHaveCount(0);
};

test.describe("civic index pages", () => {
  test("renders the state civic index as a merged stat band", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas" },
    ]);
    await expect(
      page.getByRole("heading", { level: 1, name: "Texas", exact: true }),
    ).toBeVisible();
    const { coverage } = locations.get("/tx/")!;

    const region = "Texas coverage totals";
    await expectStatValue(
      page,
      region,
      "Agencies",
      coverage.agencies.toLocaleString("en-US"),
    );
    await expectStatValue(
      page,
      region,
      "Personnel",
      coverage.personnel.toLocaleString("en-US"),
    );
    await expectStatValue(page, region, "Reports", "1");
    await expectStatValue(
      page,
      region,
      "Civil Cases",
      coverage.civilCases.toLocaleString("en-US"),
    );
    await expectStatValue(page, region, "Counties", "254");

    // Reports and civil cases drill down; personnel is data, not a link.
    await expect(statCell(page, region, "Reports")).toHaveAttribute(
      "href",
      "/tx/reports/",
    );
    await expect(statCell(page, region, "Civil Cases")).toHaveAttribute(
      "href",
      "/tx/civil-cases/",
    );
    await expect(
      statCell(page, region, "Personnel").getByRole("link"),
    ).toHaveCount(0);

    // County jump + browse-all.
    await expect(page.locator("[data-jump-select] option")).toHaveCount(255);
    await expect(
      page.getByRole("link", { name: /Browse all 254 counties/ }),
    ).toHaveAttribute("href", "/tx/counties/");

    // Unavailable topics render a neutral "--", never hedging copy, and
    // carry a "Help collect this" contribution link with query context.
    for (const topic of [
      "Budget",
      "Liability Costs",
      "Fatal Force Incidents",
      "Outcomes by Income",
    ]) {
      const cell = page
        .locator(".topic-cell")
        .filter({ has: page.getByText(topic, { exact: true }) });
      await expect(cell).toHaveCount(1);
      await expect(cell.getByText("--", { exact: true })).toBeVisible();
      await expect(
        cell.getByRole("link", { name: "Help collect this →" }),
      ).toHaveAttribute(
        "href",
        /^\/volunteer\/\?source=%2Ftx%2F&scope=state&state=tx$/,
      );
    }
    await expect(page.getByText("Not yet collected")).toHaveCount(0);
    await expect(page.getByText("not on this site yet")).toHaveCount(0);

    await expectNoOldSurfaces(page);
  });

  test("renders only the location reports attached to the state", async ({
    page,
  }) => {
    await page.goto("/tx/");
    const reports = locations.get("/tx/")!.locationReports!;
    const licensing = reports.find(
      (report) => report.reportType === "licensing_summary",
    );
    const decertification = reports.find(
      (report) => report.reportType === "decertification_report_card",
    );

    await expect(page.locator(".fact-list")).toHaveCount(licensing ? 1 : 0);
    if (licensing) {
      await expect(
        page.getByRole("heading", { name: licensing.title, exact: true }),
      ).toBeVisible();
      const { organization, facts } = licensing.payload as {
        organization: { name: string; url: string };
        facts: { label: string; value: string }[];
      };
      await expect(
        page.getByRole("link", { name: `${organization.name} →`, exact: true }),
      ).toHaveAttribute("href", organization.url);
      await expect(page.locator(".fact-list dt")).toHaveText(
        facts.map((fact) => fact.label),
      );
      await expect(page.locator(".fact-list dd")).toHaveText(
        facts.map((fact) => fact.value),
      );
      await expect(
        page.getByRole("link", { name: /wandering officers/ }),
      ).toHaveAttribute(
        "href",
        "https://www.yalelawjournal.org/article/the-wandering-officer",
      );
    }

    await expect(page.locator(".status-ledger")).toHaveCount(
      decertification ? 1 : 0,
    );
    if (decertification) {
      await expect(
        page.getByRole("heading", { name: decertification.title, exact: true }),
      ).toBeVisible();
      const { columns, note } = decertification.payload as {
        columns: { key: string; label: string; status: string }[];
        note: string;
      };
      const displayed = columns.filter(
        (column) => !["state", "name", "jurisdiction"].includes(column.key),
      );
      await expect(page.locator(".status-summary-value")).toHaveText(
        `${displayed.filter((column) => column.status === "present").length} of ${displayed.length}`,
      );
      await expect(page.locator(".status-mark")).toHaveText(
        displayed.map(
          (column) => column.status[0].toUpperCase() + column.status.slice(1),
        ),
      );
      await expect(page.locator(".civic-limit-note")).toHaveText(note);
      const source = decertification.sources.find(
        (entry) => entry.sourceType === "methodology",
      );
      if (source)
        await expect(
          page.getByRole("link", { name: "Report source", exact: true }),
        ).toHaveAttribute("href", source.url);
    }
  });

  test("renders administrative-area pages with the merged stat band", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas", href: "/tx/" },
      { label: "Dallas County" },
    ]);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Dallas County",
        exact: true,
      }),
    ).toBeVisible();

    const region = "Dallas County coverage totals";
    await expectStatValue(page, region, "Agencies", /\d+/);
    await expectStatValue(page, region, "Places", /\d+/);
    await expect(
      page.getByRole("link", { name: /Browse all \d+ places/ }),
    ).toHaveAttribute("href", "/tx/dallas-county/places/");

    // State-level context stays on the state page.
    await expect(
      page.getByRole("heading", { name: /decertification law context/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Officer licensing/ }),
    ).toHaveCount(0);

    await expectNoOldSurfaces(page);
  });

  test("renders place pages with an agency jump cell", async ({ page }) => {
    await page.goto("/tx/dallas-county/irving/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas", href: "/tx/" },
      { label: "Dallas County", href: "/tx/dallas-county/" },
      { label: "Irving" },
    ]);
    await expect(
      page.getByRole("heading", { level: 1, name: "Irving", exact: true }),
    ).toBeVisible();
    const { coverage } = locations.get("/tx/dallas-county/irving/")!;

    const region = "Irving coverage totals";
    await expectStatValue(page, region, "Agencies", "4");
    await expectStatValue(page, region, "Reports", "1");
    await expectStatValue(
      page,
      region,
      "Civil Cases",
      coverage.civilCases.toLocaleString("en-US"),
    );
    await expect(
      page.getByRole("link", { name: /Browse all 4 agencies/ }),
    ).toHaveAttribute("href", "/tx/dallas-county/irving/agencies/");

    await expectNoOldSurfaces(page);
  });
});
