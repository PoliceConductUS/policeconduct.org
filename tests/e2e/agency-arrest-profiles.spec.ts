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
test("Irving agency page displays its imported arrests and new charge breakdowns", async ({
  page,
}) => {
  const {
    rows: [row],
  } = await client.query(
    `select profile.* from public.agency_arrest_profile profile join public.agency a on a.id=profile.agency_id where a.slug='irving-police-department-049f9a'`,
  );
  await page.goto("/tx/dallas-county/irving/irving-police-department-049f9a/");
  const section = page.locator("#arrest-records");
  await expect(section).toContainText(
    `${row.coverage.totalArrests.toLocaleString("en-US")} recorded arrests`,
  );
  await expect(section).toContainText(row.coverage.firstMonth);
  await expect(section).toContainText(row.coverage.lastMonth);
  await expect(section).toContainText("one distinct booking");
  for (const [key, buckets] of Object.entries(row.breakdowns)) {
    if (key === "cells" || key === "residential_income_by_tract") continue;
    const table = section.locator(`table[data-breakdown="${key}"]`);
    await expect(table.locator("tbody tr")).toHaveCount(
      Object.keys(buckets as object).length,
    );
    const rendered = await table
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) =>
          [...row.children]
            .slice(0, 2)
            .map((cell, index) =>
              index === 0 ? cell.textContent! : cell.textContent!.trim(),
            ),
        ),
      );
    const expected = Object.entries(buckets as Record<string, number>).map(
      ([label, count]) => [label, count.toLocaleString("en-US")],
    );
    const order = (left: string[], right: string[]) =>
      left[0].localeCompare(right[0]);
    expect(rendered.sort(order)).toEqual(expected.sort(order));
  }
});
