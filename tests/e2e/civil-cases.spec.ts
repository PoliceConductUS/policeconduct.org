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

test("renders complaint summaries with a compact source link", async ({
  page,
}) => {
  // This test visits every retained summary; the combined corpus has 180 pages.
  test.setTimeout(10 * 60_000);
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select slug, ai_complaint_summary from public.civil_cases where ai_complaint_summary is not null order by id",
    );
    // An empty corpus still exercises omission on an ordinary case page.
    const { rows: absent } = await client.query(
      "select slug from public.civil_cases where ai_complaint_summary is null order by id limit 1",
    );
    for (const row of rows) {
      await page.goto(`/civil-cases/${row.slug}/`);
      const section = page.getByRole("region", {
        name: "AI-generated summary of the complaint",
        exact: true,
      });
      await expect(section).toBeVisible();
      await expect(
        section.getByRole("link", {
          name: "Read the complaint",
        }),
      ).toHaveAttribute("href", row.ai_complaint_summary.source.sourcePage);
      await expect(section).toContainText(
        row.ai_complaint_summary.summary.split(/\n\s*\n/)[0],
      );
      const context = page.getByRole("region", {
        name: "Separate procedural context",
        exact: true,
      });
      await expect(context).toHaveCount(0);
    }
    for (const row of absent) {
      await page.goto(`/civil-cases/${row.slug}/`);
      await expect(
        page.getByRole("heading", {
          name: "AI-generated summary of the complaint",
        }),
      ).toHaveCount(0);
      const donation = page
        .locator("section[aria-labelledby=complaint-summary-unavailable]")
        .getByRole("link", { name: "Donate", exact: true });
      await expect(donation).toHaveAttribute("href", "/donate/");
      await donation.click();
      await expect(page).toHaveURL(/\/donate\/$/);
    }
  } finally {
    await client.end();
  }
});
