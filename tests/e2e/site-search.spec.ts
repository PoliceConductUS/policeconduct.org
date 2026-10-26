import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Known fixture agency also used by tests/e2e/prefill.spec.ts.
const KNOWN_AGENCY = {
  name: "IRVING POLICE DEPARTMENT",
  path: "/tx/dallas-county/irving/irving-police-department-049f9a/",
};

// The masthead search input carries an explicit role="combobox" in markup
// (src/components/MastheadSearch.astro) regardless of whether JavaScript
// runs, so both the JS-enhanced and no-JS specs below look it up the same
// way via its accessible name (the visually-hidden <label for="site-search">).
const searchInputLocator = (page: Page) =>
  page.getByRole("combobox", { name: "Search records" });

test.describe("masthead search (Pagefind-enhanced)", () => {
  test("typing a known agency name surfaces a result that navigates to its page", async ({
    page,
  }) => {
    // Required coverage: build the site and serve dist/ before full validation.
    // Missing generated assets are a verification blocker, never a passing skip.
    const pagefindProbe = await page.request.get("/pagefind/pagefind.js");
    expect(
      pagefindProbe.ok(),
      "Serve the built Pagefind index before validation",
    ).toBe(true);

    await page.goto(KNOWN_AGENCY.path);

    const searchInput = searchInputLocator(page);
    await searchInput.fill("Irving Police Department");

    const listbox = page.getByRole("listbox", { name: "Search results" });
    const result = listbox.getByRole("option", {
      name: new RegExp(KNOWN_AGENCY.name, "i"),
    });
    await expect(result).toBeVisible();

    // aria-live result count announcement (site-search spec requirement).
    await expect(page.getByRole("status")).toContainText(/result/i);

    await result.click();
    await expect(page).toHaveURL(new RegExp(`${KNOWN_AGENCY.path}$`));
  });
});

test.describe("masthead search no-JS fallback", () => {
  test.use({ javaScriptEnabled: false });

  test("submitting the plain form lands on /find-records/", async ({
    page,
  }) => {
    await page.goto(KNOWN_AGENCY.path);

    const searchInput = searchInputLocator(page);
    await searchInput.fill("Irving Police Department");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/\/find-records\/\?q=/);
  });
});
