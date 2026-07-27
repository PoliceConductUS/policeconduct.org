import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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
    await expect(page.getByText("State civic index")).toBeVisible();

    const region = "Texas coverage totals";
    await expectStatValue(page, region, "Agencies", "2,937");
    await expectStatValue(page, region, "Personnel Records", "129,908");
    await expectStatValue(page, region, "Reports", "1");
    await expectStatValue(page, region, "Civil Cases", "33");
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
      statCell(page, region, "Personnel Records").getByRole("link"),
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
      ).toHaveAttribute("href", /^\/volunteer\/\?source=%2Ftx%2F&scope=state&state=tx$/);
    }
    await expect(page.getByText("Not yet collected")).toHaveCount(0);
    await expect(page.getByText("not on this site yet")).toHaveCount(0);

    await expectNoOldSurfaces(page);
  });

  test("renders licensing and decertification context on the state page", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expect(
      page.getByRole("heading", { name: "Officer licensing in Texas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Texas Commission on Law Enforcement/ }),
    ).toHaveAttribute("href", "https://www.tcole.texas.gov/");
    await expect(page.getByText("736 hours minimum")).toBeVisible();
    await expect(
      page.getByText("40 hours of training every 2 years"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /wandering officers/ }),
    ).toHaveAttribute(
      "href",
      "https://www.yalelawjournal.org/article/the-wandering-officer",
    );

    await expect(
      page.getByRole("heading", { name: "Texas decertification law context" }),
    ).toBeVisible();
    await expect(page.getByText("5 of 9")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Report source" }),
    ).toHaveAttribute("href", "https://www.mayerssolutions.com/licenserevoked");
    await expect(
      page.getByText("it is not a local agency rating", { exact: false }),
    ).toBeVisible();
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
    await expect(page.getByText("County civic index")).toBeVisible();

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
    await expect(page.getByText("Place civic index")).toBeVisible();

    const region = "Irving coverage totals";
    await expectStatValue(page, region, "Agencies", "4");
    await expectStatValue(page, region, "Reports", "1");
    await expectStatValue(page, region, "Civil Cases", "22");
    await expect(
      page.getByRole("link", { name: /Browse all 4 agencies/ }),
    ).toHaveAttribute("href", "/tx/dallas-county/irving/agencies/");

    await expectNoOldSurfaces(page);
  });
});
