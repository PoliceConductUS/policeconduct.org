import { expect, test } from "@playwright/test";

test.describe("civil cases", () => {
  test("lists civil cases sorted by filing date", async ({ page }) => {
    await page.goto("/civil-cases/");

    await expect(
      page.getByRole("heading", { name: "Civil cases" }),
    ).toBeVisible();

    const records = page.locator(".profile-record");
    const recordCount = await records.count();
    expect(recordCount).toBeGreaterThan(0);

    const dates: number[] = [];
    const datesToCheck = Math.min(recordCount, 5);
    for (let index = 0; index < datesToCheck; index += 1) {
      const dateText = await records
        .nth(index)
        .locator(".profile-record-meta span")
        .first()
        .innerText();
      const timestamp = new Date(dateText).getTime();
      expect(Number.isNaN(timestamp)).toBe(false);
      dates.push(timestamp);
    }

    for (let index = 1; index < dates.length; index += 1) {
      expect(dates[index]).toBeLessThanOrEqual(dates[index - 1]);
    }
  });

  test("uses civil case breadcrumbs on case detail pages", async ({ page }) => {
    await page.goto("/civil-cases/");

    const firstCaseLink = page.locator(".profile-record-title a").first();
    const firstCaseTitle = await firstCaseLink.innerText();
    await firstCaseLink.click();

    const breadcrumb = page.getByLabel("Breadcrumb");
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: "Civil cases" }),
    ).toBeVisible();
    await expect(breadcrumb).toContainText(firstCaseTitle);
    await expect(breadcrumb).not.toContainText("Location");
  });
});
