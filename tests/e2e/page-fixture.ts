import { test as base, expect } from "@playwright/test";

// Ordinary page journeys make a real consent choice before interacting.
// analytics.spec.mjs uses Playwright directly to test fresh consent states.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addLocatorHandler(
      page.locator("dialog[data-analytics-consent][open]"),
      async () => {
        await page
          .getByRole("button", { name: "Decline all", exact: true })
          .click();
      },
    );
    await use(page);
  },
});
export { expect };
export type { Page, Locator } from "@playwright/test";
