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
    join (
      select personnel_id from public.agency_personnel
      group by personnel_id
      having count(*)=1 and bool_or(end_date < start_date)
    ) ap on ap.personnel_id=p.id
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
  for (const destination of ["/personnel/new/", "/personnel/suggest-edit/"]) {
    const payload = await page
      .locator(`[data-prefill-to="${destination}"]`)
      .first()
      .getAttribute("data-prefill-payload");
    expect(payload).not.toBeNull();
    const fields = JSON.parse(payload!);
    expect(fields.currentAgency ?? fields.currentEmployer).toBe("");
    expect(fields.pastEmployers).toBe("");
  }
});

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The agency a personnel page names comes from the intake view
// site_personnel_headline_assignment. A page that drops the agency from its
// title, hero or structured data fails here.
const headlineSample = async (basis: string) => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query<{
          slug: string;
          agency_name: string;
          agency_path: string;
        }>(
          `
    select p.slug, a.name as agency_name, lp.path || a.slug || '/' as agency_path
    from public.site_personnel_headline_assignment h
    join public.personnel p on p.id = h.personnel_id
    join public.agency a on a.id = h.agency_id
    join public.location_path lp on lp.location_path_id = a.location_path_id
    join public.build_page_payload bpp
      on bpp.page_type = 'agency' and bpp.entity_id = a.id
    where h.headline_basis = $1 and p.deceased_on is null
    order by p.id limit 1
  `,
          [basis],
        )
      ).rows,
  );
  expect(rows).toHaveLength(1);
  return rows[0];
};

const personAndOrganization = async (page: import("@playwright/test").Page) => {
  const graph = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).flatMap((text) => JSON.parse(text)["@graph"] ?? []);
  return {
    person: graph.find((node) => node["@type"] === "Person"),
    organization: graph.find(
      (node) => node["@type"] === "GovernmentOrganization",
    ),
  };
};

test("a current headline names the agency in the title, hero and worksFor", async ({
  page,
}) => {
  const sample = await headlineSample("Current");
  const response = await page.goto(`/personnel/${sample.slug}/`);
  expect(response?.status()).toBe(200);
  expect(await page.title()).toMatch(
    new RegExp(
      `\\| ${escapeRegExp(sample.agency_name)} \\| PoliceConduct\\.org$`,
    ),
  );
  await expect(page.locator(".personnel-current-line")).toContainText(
    `Current agency: ${sample.agency_name}`,
  );
  await expect(
    page.locator(".personnel-current-line a", { hasText: sample.agency_name }),
  ).toHaveAttribute("href", sample.agency_path);
  await expect(
    page.locator(".personnel-profile-aside .personnel-status-pill"),
  ).toHaveText("Active");
  const { person, organization } = await personAndOrganization(page);
  expect(organization?.name).toBe(sample.agency_name);
  expect(person.worksFor).toEqual({ "@id": organization["@id"] });
});

test("an ended headline names the most recent agency without worksFor", async ({
  page,
}) => {
  const sample = await headlineSample("Most recent");
  const response = await page.goto(`/personnel/${sample.slug}/`);
  expect(response?.status()).toBe(200);
  expect(await page.title()).toMatch(
    new RegExp(
      `\\| Most recent: ${escapeRegExp(sample.agency_name)} \\| PoliceConduct\\.org$`,
    ),
  );
  await expect(page.locator(".personnel-current-line")).toContainText(
    `Most recent agency: ${sample.agency_name}`,
  );
  await expect(page.locator(".personnel-assignment-ended")).toHaveCount(1);
  await expect(
    page.locator(".personnel-profile-aside .personnel-status-pill"),
  ).toHaveText("Former");
  const { person, organization } = await personAndOrganization(page);
  expect(organization?.name).toBe(sample.agency_name);
  expect(person).not.toHaveProperty("worksFor");
});

test("personnel list structured data names each person's headline agency", async ({
  page,
}) => {
  const response = await page.goto("/personnel/");
  expect(response?.status()).toBe(200);
  const collection = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  )
    .map((text) => JSON.parse(text))
    .find((node) => node["@type"] === "CollectionPage");
  const items: {
    item: { url: string; worksFor?: { "@type": string; name: string } };
  }[] = collection.mainEntity.itemListElement;
  expect(items.length).toBeGreaterThan(0);
  const slugs = items.map(
    ({ item }) => new URL(item.url).pathname.split("/")[2],
  );
  const agencyBySlug = new Map(
    (
      await withDb(
        async (client) =>
          (
            await client.query<{ slug: string; agency_name: string }>(
              `select p.slug, a.name as agency_name
               from public.site_personnel_headline_assignment h
               join public.personnel p on p.id = h.personnel_id
               join public.agency a on a.id = h.agency_id
               where p.slug = any($1)`,
              [slugs],
            )
          ).rows,
      )
    ).map((row) => [row.slug, row.agency_name]),
  );
  items.forEach(({ item }, index) => {
    expect(item.worksFor).toEqual({
      "@type": "GovernmentOrganization",
      name: agencyBySlug.get(slugs[index]),
    });
    expect(item.worksFor?.name).toBeTruthy();
  });
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
