import { expect, test } from "@playwright/test";

test.describe("civic index pages", () => {
  test("renders the state civic index with administrative-area records", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expect(page.getByText("State civic index")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current record coverage" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Counties and local places with records",
      }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText(/County|Area/);
    await expect(page.getByRole("table")).toContainText("Places");
    await expect(page.getByRole("table")).not.toContainText("Address");
    await expect(
      page.getByRole("heading", { name: "Data not collected yet" }),
    ).toBeVisible();
    await expect(page.getByText("Positive-deviance practices")).toBeVisible();
  });

  test("renders administrative-area pages with place records", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expect(page.getByText(/civic index/i)).toBeVisible();
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

  test("renders place pages with agency records and canonical agency links", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/irving/");

    await expect(page.getByText("Place civic index")).toBeVisible();
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
