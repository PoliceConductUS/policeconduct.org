import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";

type FederalOffice = {
  agency_id: string;
  agency_name: string;
  canonical_path: string;
  federal_name: string;
  federal_slug: string;
  has_assignments: boolean;
};

type FederalParent = { name: string; slug: string };

let offices: FederalOffice[];
let parents: FederalParent[];

test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"]) {
    dotenv.config({ path, override: true, quiet: true });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    parents = (
      await client.query<FederalParent>(
        "select name, slug from public.federal_agency order by name",
      )
    ).rows;
    offices = (
      await client.query<FederalOffice>(`
        select
          a.id as agency_id,
          a.name as agency_name,
          lp.path || a.slug || '/' as canonical_path,
          fa.name as federal_name,
          fa.slug as federal_slug,
          exists (
            select 1 from public.agency_personnel ap where ap.agency_id = a.id and ap.end_date is null
          ) as has_assignments
        from public.agency a
        join public.federal_agency fa on fa.id = a.parent_federal_agency_id
        join public.location_path lp on lp.location_path_id = a.location_path_id
        order by fa.slug, a.id
      `)
    ).rows;
  } finally {
    await client.end();
  }

  expect(offices.length).toBeGreaterThan(0);
});

test("federal listing includes every root federal agency", async ({ page }) => {
  await page.goto("/federal/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Federal");
  await expect(page.locator("[data-jump-select] option")).toHaveCount(
    parents.length + 1,
  );
  for (const parent of parents) {
    await expect(
      page.locator(
        `[data-jump-select] option[value="/federal/${parent.slug}/"]`,
      ),
    ).toHaveText(parent.name);
  }
});

test("federal parents show their linked office counts and canonical office URLs", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const officesByParent = new Map<string, FederalOffice[]>();
  for (const office of offices.filter((office) => office.has_assignments)) {
    const linkedOffices = officesByParent.get(office.federal_slug) ?? [];
    linkedOffices.push(office);
    officesByParent.set(office.federal_slug, linkedOffices);
  }

  for (const [slug, linkedOffices] of officesByParent) {
    await page.goto(`/federal/${slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      linkedOffices[0].federal_name,
    );
    await expect(
      page
        .locator(".entity-metric-cell")
        .filter({
          has: page.getByText("Linked agency records", { exact: true }),
        })
        .locator(".ledger-value"),
    ).toHaveText(String(linkedOffices.length));
    const rows = page.locator(".record-table tbody tr");
    await expect(rows).toHaveCount(linkedOffices.length);
    for (const office of linkedOffices) {
      await expect(
        rows.getByRole("link", { name: office.agency_name }),
      ).toHaveAttribute("href", office.canonical_path);
    }
  }
});

test("root federal pages remain available without eligible offices", async ({
  page,
}) => {
  const { loadFederalAgencyDetailBySlug } =
    await import("../../src/lib/data/federal-agencies");
  const emptyParents = parents.filter(
    (parent) =>
      !offices.some(
        (office) =>
          office.federal_slug === parent.slug && office.has_assignments,
      ),
  );
  expect(emptyParents.length).toBeGreaterThan(0);
  for (const parent of emptyParents) {
    const detail = await loadFederalAgencyDetailBySlug(parent.slug);
    expect(detail).not.toBeNull();
    expect(detail!.branches).toEqual([]);
    await page.goto(`/federal/${parent.slug}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      parent.name,
    );
    await expect(page.locator(".record-table tbody tr")).toHaveCount(0);
  }
});

test("federal offices without current personnel are excluded from agency pages", async () => {
  const noPersonnelOffices = offices.filter(
    (office) => !office.has_assignments,
  );
  expect(noPersonnelOffices.length).toBeGreaterThan(0);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ entity_id: string; path: string }>(
      `select entity_id, path
       from public.build_page_payload
       where page_type = 'agency' and entity_id = any($1)`,
      [noPersonnelOffices.map((office) => office.agency_id)],
    );
    expect(rows).toEqual([]);
  } finally {
    await client.end();
  }
});
