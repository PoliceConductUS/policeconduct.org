import { expect, test } from "@playwright/test";

const inactivePath =
  "/tx/el-paso-county/el-paso/el-paso-county-criminal-court-at-law-2-x599gm/";

test("inactive agency status agrees across its header and search metadata", async ({
  page,
}) => {
  await page.goto(inactivePath);
  const status = page.locator(".agency-status--notice");
  await expect(status).toContainText("Status: Inactive");
  await expect(status).toContainText("Status date: January 7, 2004");
  await expect(status.locator("time")).toHaveAttribute(
    "datetime",
    "2004-01-07",
  );
  await expect(page).toHaveTitle(/Inactive/);
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    await expect(page.locator(selector)).toHaveAttribute(
      "content",
      /Status: Inactive\. Status date: January 7, 2004\./,
    );
  }
  for (const selector of [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ]) {
    await expect(page.locator(selector)).toHaveAttribute("content", /Inactive/);
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
      "Status: Inactive. Status date: January 7, 2004.",
    );
    expect(node).not.toHaveProperty("dissolutionDate");
    expect(node).not.toHaveProperty("foundingDate");
    expect(node.dateModified).not.toBe("2004-01-07");
  }
  expect(
    nodes.find((item) => item["@type"] === "GovernmentOrganization").name,
  ).not.toContain("Inactive");
});

test("active agency preserves its stored 1899 calendar date without a notice", async ({
  page,
}) => {
  await page.goto("/tx/dallas-county/irving/irving-police-department-049f9a/");
  const status = page.locator(".agency-status");
  await expect(status).toContainText("Status: Active");
  await expect(status).toContainText("Status date: December 31, 1899");
  await expect(status.locator("time")).toHaveAttribute(
    "datetime",
    "1899-12-31",
  );
  await expect(page.locator(".agency-status--notice")).toHaveCount(0);
  await expect(page).not.toHaveTitle(/Active/);
});
