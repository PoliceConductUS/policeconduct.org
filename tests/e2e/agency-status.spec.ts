import { expect, test } from "@playwright/test";
import { withDb } from "../../src/lib/db.js";

const storedStatus = async (slug: string) =>
  withDb(
    async (client) =>
      (
        await client.query<{ status: string }>(
          "select status from public.agency where slug = $1",
          [slug],
        )
      ).rows[0].status,
  );

const inactivePath =
  "/tx/el-paso-county/el-paso/el-paso-county-criminal-court-at-law-2-x599gm/";

test("inactive agency status agrees across its header and search metadata", async ({
  page,
}) => {
  const stored = await storedStatus(
    "el-paso-county-criminal-court-at-law-2-x599gm",
  );
  await page.goto(inactivePath);
  const status = page.locator(".agency-status");
  await expect(status).toContainText(`Status: ${stored}`);
  await expect(status).toContainText("Status date: January 7, 2004");
  await expect(status.locator("time")).toHaveAttribute(
    "datetime",
    "2004-01-07",
  );
  await expect(page).not.toHaveTitle(new RegExp(stored));
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    await expect(page.locator(selector)).toHaveAttribute(
      "content",
      new RegExp(`Status: ${stored}\\. Status date: January 7, 2004\\.`),
    );
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://www.policeconduct.org${inactivePath}`,
  );
  const nodes = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent || "{}");
        return data["@graph"] || [data];
      }),
    );
  for (const type of ["GovernmentOrganization", "ProfilePage"]) {
    const node = nodes.find((item) => item["@type"] === type);
    expect(node.description).toContain(
      `Status: ${stored}. Status date: January 7, 2004.`,
    );
    expect(node).not.toHaveProperty("dissolutionDate");
    expect(node).not.toHaveProperty("foundingDate");
    expect(node.dateModified).not.toBe("2004-01-07");
  }
  expect(
    nodes.find((item) => item["@type"] === "GovernmentOrganization").name,
  ).not.toContain(stored);
});

test("active agency preserves its stored 1899 calendar date", async ({
  page,
}) => {
  const stored = await storedStatus("irving-police-department-049f9a");
  await page.goto("/tx/dallas-county/irving/irving-police-department-049f9a/");
  const status = page.locator(".agency-status");
  await expect(status).toContainText(`Status: ${stored}`);
  await expect(status).toContainText("Status date: December 31, 1899");
  await expect(status.locator("time")).toHaveAttribute(
    "datetime",
    "1899-12-31",
  );
  await expect(page).not.toHaveTitle(new RegExp(stored));
});
