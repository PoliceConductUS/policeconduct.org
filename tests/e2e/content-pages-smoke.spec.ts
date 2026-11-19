import { expect, test } from "./page-fixture";

const contentPages = [
  { path: "/data-and-methods/", heading: "Data and Methods" },
  {
    path: "/help-center/",
    heading: "Write Reports That Stand Up to Scrutiny",
  },
  {
    path: "/frequently-asked-questions/",
    heading: "Frequently Asked Questions",
  },
];

test.describe("content pages smoke", () => {
  for (const { path, heading } of contentPages) {
    test(`loads ${path} with its main heading`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    });
  }

  test("serves the not-found page for a missing URL", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist/");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Page not found",
    );
  });
});
