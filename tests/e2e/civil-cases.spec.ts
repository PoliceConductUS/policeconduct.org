import { expect, test } from "./page-fixture";

test.describe("civil cases", () => {
  test("lists civil cases sorted by filing date", async ({ page }) => {
    await page.goto("/civil-cases/");

    await expect(
      page.getByRole("heading", { name: "Civil cases" }),
    ).toBeVisible();

    const records = page.locator(".profile-record");
    const recordCount = await records.count();
    expect(recordCount).toBeGreaterThan(0);

    const dates: number[] = [];
    const datesToCheck = Math.min(recordCount, 5);
    for (let index = 0; index < datesToCheck; index += 1) {
      const dateText = await records
        .nth(index)
        .locator(".profile-record-meta span")
        .first()
        .innerText();
      const timestamp = new Date(dateText).getTime();
      expect(Number.isNaN(timestamp)).toBe(false);
      dates.push(timestamp);
    }

    for (let index = 1; index < dates.length; index += 1) {
      expect(dates[index]).toBeLessThanOrEqual(dates[index - 1]);
    }
  });

  test("uses civil case breadcrumbs on case detail pages", async ({ page }) => {
    await page.goto("/civil-cases/");

    const firstCaseLink = page.locator(".profile-record-title a").first();
    const firstCaseTitle = await firstCaseLink.innerText();
    await firstCaseLink.click();

    const breadcrumb = page.getByLabel("Breadcrumb");
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: "Civil cases" }),
    ).toBeVisible();
    await expect(breadcrumb).toContainText(firstCaseTitle);
    await expect(breadcrumb).not.toContainText("Location");
  });
});

test("renders complaint summaries with a compact source link", async ({
  page,
}) => {
  // This test visits every retained summary; the combined corpus has 180 pages.
  test.setTimeout(10 * 60_000);
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select slug, ai_complaint_summary from public.civil_cases where ai_complaint_summary is not null order by id",
    );
    // An empty corpus still exercises omission on an ordinary case page.
    const { rows: absent } = await client.query(
      "select slug from public.civil_cases where ai_complaint_summary is null order by id limit 1",
    );
    for (const row of rows) {
      await page.goto(`/civil-cases/${row.slug}/`);
      const section = page.getByRole("region", {
        name: "AI-generated summary of the complaint",
        exact: true,
      });
      await expect(section).toBeVisible();
      await expect(
        section.getByRole("link", {
          name: "Read the complaint",
        }),
      ).toHaveAttribute("href", row.ai_complaint_summary.source.sourcePage);
      await expect(section).toContainText(
        row.ai_complaint_summary.summary.split(/\n\s*\n/)[0],
      );
      const context = page.getByRole("region", {
        name: "Separate procedural context",
        exact: true,
      });
      await expect(context).toHaveCount(0);
    }
    for (const row of absent) {
      await page.goto(`/civil-cases/${row.slug}/`);
      await expect(
        page.getByRole("heading", {
          name: "AI-generated summary of the complaint",
        }),
      ).toHaveCount(0);
      const donation = page
        .locator("section[aria-labelledby=complaint-summary-unavailable]")
        .getByRole("link", { name: "Donate", exact: true });
      await expect(donation).toHaveAttribute("href", "/donate/");
      await donation.click();
      await expect(page).toHaveURL(/\/donate\/$/);
    }
  } finally {
    await client.end();
  }
});

test("agency and place civil-case counts use only that agency's personnel links", async ({
  page,
}) => {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let agency: { path: string; own_count: number; place_count: number };
  try {
    // An agency whose personnel also have cases linked only to their
    // assignments at other agencies. Those cases must not count here.
    const { rows } = await client.query<{
      path: string;
      own_count: number;
      place_count: number;
    }>(`
      with own as (
        select ao.agency_id, count(distinct cco.civil_case_id)::int as n
        from public.civil_case_personnel cco
        join public.agency_personnel ao on ao.id = cco.agency_personnel_id
        group by ao.agency_id
      )
      select
        bpp.path,
        own.n as own_count,
        (
          select count(distinct place_cco.civil_case_id)::int
          from public.agency place_agency
          join public.location_path place_lp
            on place_lp.location_path_id = place_agency.location_path_id
          join public.agency_personnel place_ao
            on place_ao.agency_id = place_agency.id
          join public.civil_case_personnel place_cco
            on place_cco.agency_personnel_id = place_ao.id
          where place_lp.path like lp.path || '%'
        ) as place_count
      from own
      join public.agency a on a.id = own.agency_id
      join public.location_path lp on lp.location_path_id = a.location_path_id
      join public.build_page_payload bpp
        on bpp.page_type = 'agency' and bpp.entity_id = a.id
      where exists (
        select 1
        from public.civil_case_personnel cco
        join public.agency_personnel case_ao
          on case_ao.id = cco.agency_personnel_id
        join public.agency_personnel target_ao
          on target_ao.personnel_id = case_ao.personnel_id
         and target_ao.agency_id = a.id
        where case_ao.agency_id <> a.id
          and not exists (
            select 1
            from public.civil_case_personnel own_cco
            join public.agency_personnel own_ao
              on own_ao.id = own_cco.agency_personnel_id
            where own_cco.civil_case_id = cco.civil_case_id
              and own_ao.agency_id = a.id
          )
      )
      order by a.id
      limit 1
    `);
    expect(rows).toHaveLength(1);
    agency = rows[0];
  } finally {
    await client.end();
  }

  const ownCount = agency.own_count.toLocaleString("en-US");
  await page.goto(agency.path);
  await expect(
    page
      .getByRole("region", { name: /record totals$/ })
      .locator(".stat-cell")
      .filter({ has: page.getByText("Civil Cases", { exact: true }) })
      .locator(".ledger-value"),
  ).toHaveText(ownCount);

  await page.goto(`${agency.path}civil-cases/`);
  await expect(
    page.getByText(
      `${ownCount} civil cases tied to this agency's personnel records.`,
    ),
  ).toBeVisible();

  const placePath = `${agency.path.split("/").slice(0, 4).join("/")}/`;
  await page.goto(`${placePath}civil-cases/`);
  await expect(page.locator(".list-count")).toContainText(
    `${agency.place_count.toLocaleString("en-US")} cases`,
  );
});
