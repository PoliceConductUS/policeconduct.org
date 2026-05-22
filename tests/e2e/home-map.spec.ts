import { expect, test } from "@playwright/test";

test.describe("home map", () => {
  test("makes every colored state clickable", async ({ page }) => {
    await page.goto("/");

    const coloredStates = page.locator(
      '[data-usa-map] [data-map-link-type="state"][data-state-count]:not([data-state-count="0"])',
    );
    const coloredStateCount = await coloredStates.count();
    expect(coloredStateCount).toBeGreaterThan(0);

    for (let index = 0; index < coloredStateCount; index += 1) {
      const stateLink = coloredStates.nth(index);
      await expect(stateLink).toHaveAttribute("href", /\/.+/);
    }
  });

  test("clicks a colored state and navigates to records", async ({ page }) => {
    await page.goto("/");

    const stateLink = page
      .locator(
        '[data-usa-map] [data-map-link-type="state"][data-state-count]:not([data-state-count="0"])',
      )
      .first();
    const targetPath = await stateLink.getAttribute("href");

    expect(targetPath).toBeTruthy();
    await stateLink.click();
    await expect(page).toHaveURL(
      new RegExp(`${targetPath!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    );
  });
});
