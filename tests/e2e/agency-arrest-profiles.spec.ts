import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";
let client: Client;
test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"])
    dotenv.config({ path, override: true, quiet: true });
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});
test.afterAll(async () => {
  await client.end();
});
test("agency arrest loader uses the imported agency profile without summing personnel", async () => {
  const { loadArrestProfilesForAgency } =
    await import("../../src/lib/data/arrest-profiles");
  const {
    rows: [row],
  } =
    await client.query(`select profile.*, a.name, lp.path || a.slug || '/' href
    from public.agency_arrest_profile profile join public.agency a on a.id=profile.agency_id
    join public.location_path lp on lp.location_path_id=a.location_path_id
    where a.slug='irving-police-department-049f9a'`);
  expect(row).toBeDefined();
  const profiles = await loadArrestProfilesForAgency(row.agency_id);
  expect(profiles).toHaveLength(1);
  expect(profiles[0]).toMatchObject({
    id: row.id,
    agencyId: row.agency_id,
    coverage: row.coverage,
    breakdowns: row.breakdowns,
    agency: { name: row.name, href: row.href },
  });
  expect(await loadArrestProfilesForAgency("no-such-agency")).toEqual([]);
});
test("Irving agency page omits the deferred arrest display", async ({
  page,
}) => {
  await page.goto("/tx/dallas-county/irving/irving-police-department-049f9a/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Irving");
  await expect(page.locator("#arrest-records")).toHaveCount(0);
});
