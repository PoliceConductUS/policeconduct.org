import { expect, test } from "@playwright/test";
import "dotenv/config";
import { Client } from "pg";

// These specs exercise the align-report-pages parity work: the report
// detail page (src/pages/.../reports/.../[slug]/index.astro +
// src/lib/report-detail.ts) and the agency personnel report-count fix
// (src/lib/data/agency-detail.ts). Both need real dev-data fixtures rather
// than mocked routes, so this file looks the fixtures up live from the dev
// database (DATABASE_URL) instead of hardcoding slugs/paths that would go
// stale the moment the seed data is regenerated. See
// openspec/changes/align-report-pages/ for the requirements these assert.

type ReportFixture = {
  path: string;
};

type PersonnelFixture = {
  agencyPersonnelPath: string;
  officerName: string;
};

let reportFixture: ReportFixture | null = null;
let personnelFixture: PersonnelFixture | null = null;
let fixtureLookupError: string | null = null;

test.beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fixtureLookupError =
      "DATABASE_URL is not set; cannot look up dev-data fixtures.";
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();

    // A report whose officers carry rating data (so the "no rating badges"
    // assertion is meaningful, not vacuous) and whose incident date we can
    // turn into the report detail page's date-segmented URL.
    const reportRow = (
      await client.query(`
        select
          r.slug,
          lp.path as location_path,
          to_char(r.incident_date, 'YYYY-MM-DD') as incident_date
        from public.reviews r
        join public.location_path lp
          on lp.location_path_id = r.location_path_id
        join public.review_officers ro on ro.review_id = r.id
        join public.review_officers_ratings rr
          on rr.review_officer_id = ro.id
        group by r.id, lp.path
        order by r.slug
        limit 1
      `)
    ).rows[0] as
      | { slug: string; location_path: string; incident_date: string }
      | undefined;

    if (reportRow) {
      const [year, month, day] = reportRow.incident_date.split("-");
      reportFixture = {
        path: `${reportRow.location_path}reports/${year}/${month}/${day}/${reportRow.slug}/`,
      };
    }

    // The smallest agency (fewest personnel, so the row is on the
    // unpaginated first page) that has at least one officer with a linked
    // report, per the live review_officers <-> agency_officers join
    // agency-detail.ts now uses instead of the stale officers_stats
    // projection.
    const personnelRow = (
      await client.query(`
        select
          bpp.path as agency_path,
          o.first_name,
          o.last_name
        from public.review_officers ro
        join public.agency_officers ao on ao.id = ro.agency_officer_id
        join public.agency a on a.id = ao.agency_id
        join public.officers o on o.id = ao.officer_id
        join public.build_page_payload bpp
          on bpp.page_type = 'agency' and bpp.entity_id = a.id
        join (
          select agency_id, count(*) as officer_count
          from public.agency_officers
          group by agency_id
        ) sizes on sizes.agency_id = a.id
        group by bpp.path, o.first_name, o.last_name, o.id, sizes.officer_count, a.id
        order by sizes.officer_count asc, a.id asc, o.id asc
        limit 1
      `)
    ).rows[0] as
      | {
          agency_path: string;
          first_name: string | null;
          last_name: string | null;
        }
      | undefined;

    if (personnelRow) {
      const officerName = [personnelRow.last_name, personnelRow.first_name]
        .filter(Boolean)
        .join(", ");
      personnelFixture = {
        agencyPersonnelPath: `${personnelRow.agency_path}personnel/`,
        officerName,
      };
    }

    if (!reportRow || !personnelRow) {
      fixtureLookupError =
        "Dev database has no reports with officer ratings, or no agency " +
        "with a report-linked officer; these fixtures are required for " +
        "the report-pages e2e specs.";
    }
  } catch (error) {
    fixtureLookupError = `Could not query the dev database for report-pages fixtures: ${String(error)}`;
  } finally {
    await client.end().catch(() => {});
  }
});

test.describe("report detail page", () => {
  test.beforeEach(() => {
    test.skip(
      !reportFixture,
      fixtureLookupError ??
        "No report fixture with rated officers found in dev data.",
    );
  });

  test('renders the factual account under "What happened"', async ({
    page,
  }) => {
    await page.goto(reportFixture!.path);

    await expect(
      page.getByRole("heading", { name: "What happened" }),
    ).toBeVisible();
  });

  test("renders fact-list rows only for present fields", async ({ page }) => {
    await page.goto(reportFixture!.path);

    const factList = page.locator(".fact-list");

    // Always-present required facts render.
    await expect(
      factList.locator("dt").filter({ hasText: "Incident date" }),
    ).toHaveCount(1);
    await expect(
      factList.locator("dt").filter({ hasText: "Agency" }),
    ).toHaveCount(1);

    // Known-absent optional facts (this dev fixture has no stored charges,
    // case number, or setting) render no row at all -- no placeholder, no
    // fabricated content.
    await expect(
      factList.locator("dt").filter({ hasText: "Charges" }),
    ).toHaveCount(0);
    await expect(
      factList.locator("dt").filter({ hasText: "Case number" }),
    ).toHaveCount(0);
    await expect(
      factList.locator("dt").filter({ hasText: "Setting" }),
    ).toHaveCount(0);
  });

  test("never renders per-officer ratings or rating badges", async ({
    page,
  }) => {
    await page.goto(reportFixture!.path);

    // This fixture's officers have review_officers_ratings rows (see the
    // beforeAll query), so this is a real assertion that rating data is
    // suppressed, not a vacuous pass.
    await expect(page.locator(".rating-badge")).toHaveCount(0);
  });

  test("never renders reporter identity strings", async ({ page }) => {
    await page.goto(reportFixture!.path);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    await expect(page.getByText(/reporter/i)).toHaveCount(0);
  });

  test('omits the "How it felt" section when there is no stored feelings content', async ({
    page,
  }) => {
    await page.goto(reportFixture!.path);

    // This dev fixture has no stored feelings text; the labeled subjective
    // section must not render at all in that case.
    await expect(
      page.getByRole("heading", { name: "How it felt" }),
    ).toHaveCount(0);
  });
});

test.describe("agency personnel report counts", () => {
  test.beforeEach(() => {
    test.skip(
      !personnelFixture,
      fixtureLookupError ??
        "No agency with a report-linked officer found in dev data.",
    );
  });

  test("shows a non-zero live report count for an officer with linked reports", async ({
    page,
  }) => {
    await page.goto(personnelFixture!.agencyPersonnelPath);

    const row = page.locator("table.record-table tbody tr").filter({
      has: page.getByRole("link", { name: personnelFixture!.officerName }),
    });
    await expect(row).toHaveCount(1);

    const reportsCell = row.locator("td.num");
    const reportsText = (await reportsCell.innerText()).trim();
    expect(Number(reportsText)).toBeGreaterThan(0);
  });
});
