import { expect, test } from "@playwright/test";
import { withDb } from "../../src/lib/db.js";

test("a retained reversed-date assignment does not claim current or former employment", async ({
  page,
}) => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query<{ slug: string }>(`
    select p.slug from public.personnel p
    where exists (select 1 from public.agency_personnel ap where ap.personnel_id=p.id and ap.end_date < ap.start_date)
      and (select count(*) from public.agency_personnel ap where ap.personnel_id=p.id)=1
    order by p.id limit 1
  `)
      ).rows,
  );
  expect(rows).toHaveLength(1);
  const response = await page.goto(`/personnel/${rows[0].slug}/`);
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Recorded agency", { exact: true })).toHaveCount(
    1,
  );
  await expect(
    page.getByText("Status uncertain", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(0);
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const people = schemas
    .flatMap((text) => JSON.parse(text)["@graph"] ?? [])
    .filter((node) => node["@type"] === "Person");
  expect(people.length).toBeGreaterThan(0);
  for (const person of people) expect(person).not.toHaveProperty("worksFor");
});

test("Texas report titles remain report titles in visible links and structured data", async ({
  page,
}) => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query<{ title: string }>(`
    select r.title from public.reviews r join public.location_path l on l.location_path_id=r.location_path_id
    where l.path like '/tx/%' order by r.incident_date desc,r.id
  `)
      ).rows,
  );
  expect(rows.length).toBeGreaterThan(0);
  const response = await page.goto("/tx/reports/");
  expect(response?.status()).toBe(200);
  expect(
    await page.locator(".report-archive-list a > span").allTextContents(),
  ).toEqual(rows.map((row) => row.title));
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const collection = schemas
    .map((text) => JSON.parse(text))
    .find((node) => node["@type"] === "CollectionPage");
  expect(
    collection.mainEntity.itemListElement.map(
      (item: { name: string }) => item.name,
    ),
  ).toEqual(rows.map((row) => row.title));
});
