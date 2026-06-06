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

const visitorIntentBands = [
  "Positive-deviance",
  "Police contact and enforcement activity",
  "Disparate impact and community outcomes",
  "Public cost and litigation",
  "Complaints, discipline, force, lawsuits, and accountability outcomes",
  "Officer credibility, search validity, force justification, and impeachment records",
  "Policy safeguards and accountability systems",
];

const getTopMetricCard = (
  page: Page,
  regionName: string | RegExp,
  label: string,
) =>
  page
    .getByRole("region", { name: regionName })
    .locator("article")
    .filter({ has: page.getByText(label, { exact: true }) });

const expectTopMetric = async (
  page: Page,
  regionName: string | RegExp,
  label: string,
  expectedValue: string | RegExp,
) => {
  const card = getTopMetricCard(page, regionName, label);
  await expect(card).toHaveCount(1);
  await expect(card.locator(".metric-value")).toHaveText(expectedValue);
};

const expectVisitorIntentBands = async (page: Page) => {
  await expect(
    page.getByRole("heading", { level: 2 }).filter({
      hasText:
        /Positive-deviance|Police contact|Disparate impact|Public cost|Complaints|Officer credibility|Policy safeguards/,
    }),
  ).toHaveText(visitorIntentBands);
};

const expectNoOldBrowseSurface = async (page: Page, label: string) => {
  await expect(
    page.getByRole("heading", { name: `Explore within ${label}` }),
  ).toHaveCount(0);
  await expect(page.getByPlaceholder("Search this index")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
};

test.describe("civic index pages", () => {
  test("renders the state civic index with visitor-intent bands", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas" },
    ]);
    await expect(page.getByText("State civic index")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Top Texas Civic Index metrics" }),
    ).toBeVisible();
    await expectTopMetric(
      page,
      "Top Texas Civic Index metrics",
      "Counties",
      "254",
    );
    await expectTopMetric(
      page,
      "Top Texas Civic Index metrics",
      "Reports",
      "1",
    );
    await expect(
      page.getByRole("link", { name: "Explore counties" }),
    ).toHaveAttribute("href", "/tx/counties/");
    await expectVisitorIntentBands(page);
    await expect(
      page.getByRole("heading", { name: "Reports by month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Civil cases" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Decertification law context" }),
    ).toBeVisible();
    await expect(
      page.getByText("Top tier of most empowering mechanisms and processes"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Report source" }),
    ).toHaveAttribute("href", "https://www.mayerssolutions.com/licenserevoked");
    await expect(
      page.getByRole("link", {
        name: "Mayers Strategic Solutions decertification report card",
      }),
    ).toHaveCount(0);
    await expectNoOldBrowseSurface(page, "Texas");
    await expect(page.locator("body")).not.toContainText(
      /Missing data|Data not collected yet|Not collected yet|placeholder|Research areas in development/i,
    );
  });

  test("keeps state top metrics focused on state-level summary counts", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expectTopMetric(
      page,
      "Top Texas Civic Index metrics",
      "Counties",
      "254",
    );
    await expectTopMetric(
      page,
      "Top Texas Civic Index metrics",
      "Civil Cases",
      "33",
    );
    await expect(
      getTopMetricCard(
        page,
        "Top Texas Civic Index metrics",
        "Personnel records",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Explore counties" }),
    ).toHaveAttribute("href", "/tx/counties/");
  });

  test("renders administrative-area pages with visitor-intent bands", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas", href: "/tx/" },
      { label: "Dallas County" },
    ]);
    await expect(page.getByText("County civic index")).toBeVisible();
    await expectTopMetric(
      page,
      "Top Dallas County Civic Index metrics",
      "Places",
      /\d+/,
    );
    await expect(
      page.getByRole("link", { name: "Explore places" }),
    ).toHaveAttribute("href", "/tx/dallas-county/places/");
    await expectVisitorIntentBands(page);
    await expect(
      page.getByRole("heading", { name: "Reports by month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Decertification law context" }),
    ).toHaveCount(0);
    await expectNoOldBrowseSurface(page, "Dallas County");
  });

  test("keeps administrative-area top metrics focused on local summary counts", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expectTopMetric(
      page,
      "Top Dallas County Civic Index metrics",
      "Reports",
      /\d+/,
    );
    await expectTopMetric(
      page,
      "Top Dallas County Civic Index metrics",
      "Civil Cases",
      /\d+/,
    );
    await expect(
      getTopMetricCard(
        page,
        "Top Dallas County Civic Index metrics",
        "Personnel records",
      ),
    ).toHaveCount(0);
  });

  test("renders place pages with visitor-intent bands and agency summary links", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/irving/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas", href: "/tx/" },
      { label: "Dallas County", href: "/tx/dallas-county/" },
      { label: "Irving" },
    ]);
    await expect(page.getByText("Place civic index")).toBeVisible();
    await expectTopMetric(
      page,
      "Top Irving Civic Index metrics",
      "Agencies",
      "4",
    );
    await expect(
      page.getByRole("link", { name: "Explore agencies" }),
    ).toHaveAttribute("href", "/tx/dallas-county/irving/agencies/");
    await expectVisitorIntentBands(page);
    await expect(
      page.getByRole("heading", { name: "Decertification law context" }),
    ).toHaveCount(0);
    await expectNoOldBrowseSurface(page, "Irving");
  });

  test("shows place report and civil case summary counts", async ({ page }) => {
    await page.goto("/tx/dallas-county/irving/");

    await expectTopMetric(
      page,
      "Top Irving Civic Index metrics",
      "Reports",
      "1",
    );
    await expectTopMetric(
      page,
      "Top Irving Civic Index metrics",
      "Civil Cases",
      "22",
    );
    await expect(
      getTopMetricCard(
        page,
        "Top Irving Civic Index metrics",
        "Personnel records",
      ),
    ).toHaveCount(0);
  });

  test("does not render removed browse table controls", async ({ page }) => {
    await page.goto("/tx/");
    const beforeUrl = page.url();

    await expectNoOldBrowseSurface(page, "Texas");
    await expect(
      page.getByRole("heading", { name: "Top 5 things to know" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Action Center" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(beforeUrl);
    await expect(
      page.getByRole("heading", {
        name: "Police contact and enforcement activity",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reports by month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Public reports by month" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Report volume by month" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Better outcomes and positive-deviance signals",
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Positive-deviance" }),
    ).toBeVisible();
  });
});
