import { expect, test } from "@playwright/test";

test("Dataset creator and publisher resolve to a supported organization", async ({
  page,
}) => {
  await page.goto("/");
  const entries = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent!)),
    );
  const dataset = entries.find((entry) => entry["@type"] === "Dataset");
  expect(dataset).toBeDefined();
  const organization = entries.find(
    (entry) => entry["@id"] === dataset.creator["@id"],
  );
  expect(organization).toBeDefined();
  expect(dataset.publisher["@id"]).toBe(organization["@id"]);
  expect(organization["@type"]).toBe("Organization");
  expect(organization.nonprofitStatus).toBe(
    "https://schema.org/Nonprofit501c3",
  );
});

test("Dataset geographic coverage uses a supported place", async ({ page }) => {
  await page.goto("/");
  const entries = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent!)),
    );
  const dataset = entries.find((entry) => entry["@type"] === "Dataset");
  expect(dataset).toBeDefined();
  expect(dataset.spatialCoverage).toEqual({
    "@type": "Place",
    name: "United States",
  });
});
