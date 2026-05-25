import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const readTableRow = async (page: Page, href: string) => {
  const row = page
    .getByRole("table")
    .locator("tbody tr")
    .filter({ has: page.locator(`a[href="${href}"]`) });

  await expect(row).toHaveCount(1);

  return row.evaluate((element) => {
    const table = element.closest("table");

    if (!table) {
      throw new Error("Expected civic index row to be inside a table.");
    }

    const headings = Array.from(table.querySelectorAll("thead th")).map(
      (heading) => heading.textContent?.trim() || "",
    );
    const cells = Array.from(element.querySelectorAll("td")).map(
      (cell) => cell.textContent?.trim() || "",
    );

    return Object.fromEntries(
      headings.map((heading, index) => [heading, cells[index] || ""]),
    );
  });
};

const readCount = (row: Record<string, string>, label: string) =>
  Number(row[label]?.replaceAll(",", "") || 0);

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

test.describe("civic index pages", () => {
  test("renders the state civic index with administrative-area records", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas" },
    ]);
    await expect(page.getByText("State civic index")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Top 5 things to know" }),
    ).toBeVisible();
    await expect(page.getByText("Agencies tracked")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current record picture" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Where records concentrate within Texas",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Trends over time" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Use-of-force incidents over time" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Complaint outcomes over time" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Settlement and payout history" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Action Center" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Explore within Texas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Counties / Areas within Texas",
      }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText(/County|Area/);
    await expect(page.getByRole("table")).toContainText("Places");
    await expect(page.getByRole("table")).not.toContainText("Address");
    await expect(
      page.getByRole("link", {
        name: "Volunteer to request and analyze records",
      }),
    ).toHaveAttribute("href", "/volunteer/?ref=%2Ftx%2F");
    await expect(
      page.getByRole("heading", {
        name: "Texas decertification law context",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Top tier of most empowering mechanisms and processes"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Mayers Strategic Solutions decertification report card",
      }),
    ).toHaveAttribute("href", "https://www.mayerssolutions.com/licenserevoked");
    await expect(page.locator("body")).not.toContainText(
      /Missing data|Data not collected yet|Not collected yet|placeholder|Research areas in development/i,
    );
  });

  test("rolls jurisdiction counts up to state child rows", async ({ page }) => {
    await page.goto("/tx/");

    const dallasCounty = await readTableRow(page, "/tx/dallas-county/");

    expect(readCount(dallasCounty, "Personnel")).toBeGreaterThan(0);
    expect(readCount(dallasCounty, "Reports")).toBeGreaterThan(0);
    expect(readCount(dallasCounty, "Civil cases")).toBeGreaterThan(0);
  });

  test("renders administrative-area pages with place records", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expectBreadcrumbs(page, [
      { label: "Home", href: "/" },
      { label: "Texas", href: "/tx/" },
      { label: "Dallas County" },
    ]);
    await expect(page.getByText("County civic index")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Explore within Dallas County" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Places within Dallas County" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Texas decertification law context",
      }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Place");
    await expect(page.getByRole("table")).toContainText("Agencies");
    await expect(page.getByRole("table")).not.toContainText("Address");
    await expect(
      page
        .getByRole("table")
        .getByRole("link", { name: /Irving/i })
        .first(),
    ).toHaveAttribute("href", "/tx/dallas-county/irving/");
  });

  test("rolls jurisdiction counts up to administrative-area child rows", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    const irving = await readTableRow(page, "/tx/dallas-county/irving/");

    expect(readCount(irving, "Personnel")).toBeGreaterThan(0);
    expect(readCount(irving, "Reports")).toBeGreaterThan(0);
    expect(readCount(irving, "Civil cases")).toBeGreaterThan(0);
  });

  test("renders place pages with agency records and canonical agency links", async ({
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
    await expect(
      page.getByRole("heading", { name: "Explore within Irving" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Agencies within Irving" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Texas decertification law context",
      }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Agency");
    await expect(page.getByRole("table")).toContainText("Address");

    const firstAgencyLink = page
      .getByRole("table")
      .getByRole("link", { name: /police|sheriff|department/i })
      .first();
    await expect(firstAgencyLink).toHaveAttribute(
      "href",
      /\/tx\/dallas-county\/irving\/[^/]+\/$/,
    );
  });

  test("shows agency personnel, report, and civil case counts", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/irving/");

    const irvingPolice = await readTableRow(
      page,
      "/tx/dallas-county/irving/irving-police-department-049f9a/",
    );

    expect(readCount(irvingPolice, "Personnel")).toBeGreaterThan(0);
    expect(readCount(irvingPolice, "Reports")).toBeGreaterThan(0);
    expect(readCount(irvingPolice, "Civil cases")).toBeGreaterThan(0);
  });

  test("filters and sorts the civic index table without changing the page URL", async ({
    page,
  }) => {
    await page.goto("/tx/");
    const beforeUrl = page.url();
    const table = page.getByRole("table");

    await page.getByPlaceholder("Search this index").fill("Dallas");
    await expect(page).toHaveURL(beforeUrl);
    await expect(table).toContainText(/Dallas/i);

    const placesHeader = page.getByRole("columnheader", { name: "Places" });
    await expect(placesHeader).toHaveAttribute("aria-sort", "none");

    await placesHeader.getByRole("button", { name: "Places" }).click();
    await expect(placesHeader).toHaveAttribute("aria-sort", "ascending");

    await placesHeader.getByRole("button", { name: "Places" }).click();
    await expect(placesHeader).toHaveAttribute("aria-sort", "descending");
  });
});
