import { expect, test } from "@playwright/test";
import { withDb } from "../../src/lib/db.js";

// Public staff and civil-case counts are read from the intake views
// site_agency_count, site_personnel_state_count and site_personnel_count.
// These checks compare the rendered text with the view rows.
const formatCount = (value: number) => value.toLocaleString("en-US");

// The agency page and roster show distinct people, so the check uses an
// agency where some person has more than one agency_personnel row.
test("agency page and roster show the site_agency_count distinct-people counts", async ({
  page,
}) => {
  const [agency] = await withDb(
    async (client) =>
      (
        await client.query<{
          canonical_path: string;
          personnel_count: number;
          current_personnel_count: number;
          former_personnel_count: number;
          unknown_personnel_count: number;
        }>(`
          select lp.path || a.slug || '/' as canonical_path,
                 c.personnel_count, c.current_personnel_count,
                 c.former_personnel_count, c.unknown_personnel_count
          from public.site_agency_count c
          join public.agency a on a.id = c.agency_id
          join public.location_path lp on lp.location_path_id = a.location_path_id
          join public.build_page_payload bpp
            on bpp.page_type = 'agency' and bpp.entity_id = a.id
          where c.current_personnel_count > 0
            and c.former_personnel_count > 0
            and c.personnel_count < c.assignment_count
          order by c.personnel_count, a.id
          limit 1
        `)
      ).rows,
  );
  expect(agency).toBeDefined();
  const response = await page.goto(agency.canonical_path);
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText(
      `${formatCount(agency.former_personnel_count)} former on record`,
      { exact: true },
    ),
  ).toBeVisible();

  await page.goto(`${agency.canonical_path}personnel/`);
  const uncertain = agency.unknown_personnel_count
    ? ` · ${formatCount(agency.unknown_personnel_count)} uncertain`
    : "";
  await expect(page.locator("[data-roster-summary]")).toHaveText(
    `${formatCount(agency.personnel_count)} personnel · ${formatCount(agency.current_personnel_count)} current · ${formatCount(agency.former_personnel_count)} former${uncertain}`,
  );
});

test("personnel profile civil cases card shows site_personnel_count", async ({
  page,
}) => {
  const [person] = await withDb(
    async (client) =>
      (
        await client.query<{
          slug: string;
          civil_case_count: number;
          open_civil_case_count: number;
        }>(`
          select p.slug, c.civil_case_count, c.open_civil_case_count
          from public.site_personnel_count c
          join public.personnel p on p.id = c.personnel_id
          where c.civil_case_count > 0
          order by p.id
          limit 1
        `)
      ).rows,
  );
  expect(person).toBeDefined();
  const response = await page.goto(`/personnel/${person.slug}/`);
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText(
      `${formatCount(person.open_civil_case_count)} / ${formatCount(person.civil_case_count)}`,
      { exact: true },
    ),
  ).toBeVisible();
});

test("personnel index states covered matches site_personnel_state_count", async ({
  page,
}) => {
  const [{ states }] = await withDb(
    async (client) =>
      (
        await client.query<{ states: number }>(
          "select count(*)::integer as states from public.site_personnel_state_count where listed_personnel_count > 0",
        )
      ).rows,
  );
  const response = await page.goto("/personnel/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText(`${states} states covered`, { exact: true }),
  ).toBeVisible();
});
