import { expect, test } from "@playwright/test";
import { withDb } from "../../src/lib/db.js";
import { currentAssignmentSql } from "../../src/lib/data/annotation-access.js";

test("current assignment SQL distinguishes open dates from unrepresentable source dates", async () => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query(`
    with assignments(id, end_date, data_source_values) as (values
      ('open', null::date, '{}'::jsonb),
      ('explicit-null', null::date, '{"end_date":{"effective_value":null}}'::jsonb),
      ('invalid', null::date, '{"end_date":{"effective_value":"not a date"}}'::jsonb),
      ('empty', null::date, '{"end_date":{"effective_value":""}}'::jsonb),
      ('ended', '2024-01-01'::date, '{}'::jsonb)
    ) select id from assignments a where ${currentAssignmentSql("a")} order by id
  `)
      ).rows,
  );
  expect(rows.map((row) => row.id)).toEqual(["explicit-null", "open"]);
});

test("personnel profiles show reported dates without calculated tenure", async ({
  page,
}) => {
  await page.goto("/personnel/james-markham-v-7635c7/");
  await expect(
    page.getByText("Total Time as Officer", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Reported duration:/)).toHaveCount(0);
  await expect(page.locator(".personnel-profile-aside")).toBeVisible();
});

test("agency findings without a public agency page remain visible through their source authority", async () => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  await withDb(async (client) => {
    await client.query("begin");
    try {
      await client.query(
        `update public.licensing_authority set source_namespaces = array_append(source_namespaces, 'fixture.no-page') where id = (select id from public.licensing_authority order by id limit 1)`,
      );
      await client.query(
        `insert into public.agency (id, slug, name, state, location_path_id, address, city, zip_code, latitude, longitude) select $1::jsonb->>'id', $1::jsonb->>'slug', $1::jsonb->>'name', a.state, a.location_path_id, a.address, a.city, a.zip_code, a.latitude, a.longitude from public.agency a limit 1`,
        [
          JSON.stringify({
            id: "annotation-no-page-fixture",
            slug: "annotation-no-page-fixture",
            name: "Fixture agency without assignments",
          }),
        ],
      );
      for (const producer of ["manual", "fixture.no-page", "intake"]) {
        await client.query(
          `insert into public.data_annotation (id, subject_kind, subject_id, type, field, value, message, source_namespace, source_record_id, producer_namespace, producer_record_id, status)
           values ($1, 'Agency', 'annotation-no-page-fixture', 'error', 'contact_email', '"invalid"'::jsonb, 'Invalid source email', 'fixture.no-page', 'fixture-1', $2, 'fixture-1', 'active')`,
          [`annotation-fixture-${producer}`, producer],
        );
      }
      await client.query(
        `insert into public.data_annotation (id, subject_kind, subject_id, type, field, value, message, source_namespace, source_record_id, producer_namespace, producer_record_id, status)
         values ('annotation-fixture-resolved', 'Agency', 'annotation-no-page-fixture', 'error', 'contact_email', '"resolved"'::jsonb, 'Resolved finding', 'fixture.no-page', 'fixture-2', 'manual', 'fixture-2', 'resolved')`,
      );
      const entries = await collectDataAnnotations(client);
      const unlisted = (
        await client.query(
          `select a.id, count(*)::int as count from public.agency a join public.data_annotation da on da.subject_kind='Agency' and da.subject_id=a.id and da.status='active' where not exists (select 1 from public.agency_personnel ap where ap.agency_id=a.id and ${currentAssignmentSql("ap")}) group by a.id`,
        )
      ).rows;
      for (const agency of unlisted) {
        const findings = entries.filter(
          (entry) =>
            entry.entity_kind === "Agency" && entry.canonical_id === agency.id,
        );
        expect(findings).toHaveLength(agency.count);
        for (const finding of findings)
          expect(finding.record_url).toMatch(
            /^\/[^/]+\/licensing-authority\/data-annotations\/$/,
          );
      }
      expect(
        entries.filter(
          (entry) => entry.canonical_id === "annotation-no-page-fixture",
        ),
      ).toHaveLength(3);
      expect(
        entries.some((entry) => entry.message === "Resolved finding"),
      ).toBe(false);
      const finding = entries.find(
        (entry) => entry.canonical_id === "annotation-no-page-fixture",
      );
      expect(finding).toMatchObject({
        record_label: "Fixture agency without assignments",
        source_record_id: "fixture-1",
        value: "invalid",
      });
      const authority = (
        await client.query(
          `select lp.path from public.licensing_authority la join public.location_path lp on lp.location_path_id = la.location_path_id where 'fixture.no-page' = any(la.source_namespaces)`,
        )
      ).rows[0];
      expect(finding?.record_url).toBe(
        `${authority.path}licensing-authority/data-annotations/`,
      );
      await client.query(
        "update public.licensing_authority set source_namespaces = array_remove(source_namespaces, 'fixture.no-page')",
      );
      await expect(collectDataAnnotations(client)).rejects.toThrow(
        /source authority/,
      );
    } finally {
      await client.query("rollback");
    }
  });
});

test("the conventional favicon URL serves the existing icon", async ({
  request,
}) => {
  const response = await request.get("/favicon.ico");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/");
  expect((await response.body()).length).toBeGreaterThan(0);
});

test("agency email lists render individual addresses without pairing them with a name", async ({
  page,
}) => {
  const agencies = await withDb(
    async (client) =>
      (
        await client.query(
          `select a.contact_email, a.contact_name, lp.path || a.slug || '/' as path from public.agency a join public.location_path lp on lp.location_path_id=a.location_path_id where a.contact_email like '%;%' and a.contact_name is not null and exists (select 1 from public.build_page_payload p where p.page_type='agency' and p.entity_id=a.id) order by a.id limit 1`,
        )
      ).rows,
  );
  expect(agencies).toHaveLength(1);
  const agency = agencies[0];
  await page.goto(agency.path);
  const addresses = agency.contact_email
    .split(";")
    .map((value: string) => value.trim());
  const contacts = page.locator(".entity-contact-email");
  await expect(contacts.locator("a")).toHaveCount(addresses.length);
  for (const address of addresses)
    await expect(contacts.locator(`a[href="mailto:${address}"]`)).toHaveText(
      address,
    );
  await expect(page.locator(".entity-contact-person a")).toHaveCount(0);
  const nodes = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent || "{}");
        return data["@graph"] || [data];
      }),
    );
  expect(
    nodes.find((node) => node["@type"] === "GovernmentOrganization").email,
  ).toEqual(addresses);
});

test("active native annotations render in the public index and CSV", async ({
  page,
  request,
}) => {
  const { collectDataAnnotations } =
    await import("../../src/lib/data/data-annotations");
  const entries = await withDb(collectDataAnnotations);
  expect(entries.length).toBeGreaterThan(0);
  await page.goto("/data-annotations/");
  const rows = page.locator("main table tbody tr");
  await expect(rows).toHaveCount(Math.min(entries.length, 50));
  await expect(rows.first()).toContainText(entries[0].message);
  await expect(rows.first()).toContainText(entries[0].source_record_id);
  const csv = await request.get("/data-annotations/data.csv");
  expect(csv.ok()).toBe(true);
  expect(await csv.text()).toContain(entries[0].message.replaceAll('"', '""'));
});
