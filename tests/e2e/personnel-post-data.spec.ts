import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { Client } from "pg";
import { loadDisciplineForPersonnel } from "../../src/lib/data/licensing";

let client: Client;

test.beforeAll(async () => {
  for (const path of [".env", ".env-recaptcha", ".env-policeconduct"]) {
    dotenv.config({ path, override: true, quiet: true });
  }
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

test.afterAll(async () => {
  await client.end();
});

test("direct discipline returns one full record with its exact authority and distinct linked agencies", async () => {
  const {
    rows: [fixture],
  } = await client.query<{
    id: string;
    personnel_id: string;
    action: string;
    effective_date: string | null;
    expiration_date: string | null;
    case_number: string | null;
    document_url: string | null;
    allegation: string | null;
    violation: string | null;
    finding: string | null;
    chief_action: string | null;
    sanction: string | null;
    authority_name: string;
    authority_abbreviation: string | null;
    authority_path: string;
  }>(`
    select d.id, d.personnel_id, d.action,
      d.effective_date::text, d.expiration_date::text, d.case_number,
      d.document_url, d.allegation, d.violation, d.finding,
      d.chief_action, d.sanction,
      la.name as authority_name, la.abbreviation as authority_abbreviation,
      lp.path as authority_path
    from public.discipline d
    join public.licensing_authority la on la.id = d.licensing_authority_id
    join public.location_path lp on lp.location_path_id = la.location_path_id
    where d.allegation is not null
      and (select count(distinct ap.agency_id)
        from public.discipline_agency_personnel dap
        join public.agency_personnel ap on ap.id = dap.agency_personnel_id
        where dap.discipline_id = d.id) > 1
    order by d.id limit 1
  `);
  expect(fixture).toBeTruthy();
  const { rows: agencyRows } = await client.query<{ id: string; name: string }>(
    `select distinct a.id, a.name
     from public.discipline_agency_personnel dap
     join public.agency_personnel ap on ap.id = dap.agency_personnel_id
     join public.agency a on a.id = ap.agency_id
     where dap.discipline_id = $1 order by a.name, a.id`,
    [fixture.id],
  );

  const records = await loadDisciplineForPersonnel(fixture.personnel_id);
  expect(records.filter((record) => record.id === fixture.id)).toHaveLength(1);
  expect(records.find((record) => record.id === fixture.id)).toEqual({
    id: fixture.id,
    action: fixture.action,
    effectiveDate: fixture.effective_date,
    expirationDate: fixture.expiration_date,
    caseNumber: fixture.case_number,
    documentUrl: fixture.document_url,
    allegation: fixture.allegation,
    violation: fixture.violation,
    finding: fixture.finding,
    chiefAction: fixture.chief_action,
    sanction: fixture.sanction,
    authority: {
      name: fixture.authority_name,
      abbreviation: fixture.authority_abbreviation,
      href: `${fixture.authority_path}licensing-authority/`,
    },
    agencies: agencyRows,
  });
});

test("education loader keeps recorded date text, numeric credits, and stable newest-first order", async () => {
  const { loadEducationForPersonnel } =
    await import("../../src/lib/data/personnel-education");
  const {
    rows: [person],
  } = await client.query<{ personnel_id: string }>(
    `select personnel_id from public.personnel_education
     group by personnel_id having count(*) > 10
     order by count(*) desc, personnel_id limit 1`,
  );
  expect(person).toBeTruthy();
  const { rows: expected } = await client.query(
    `select id, name, completion_date::text as completion_date,
      credits::text as credits, sponsor_name, sponsor_instructor
     from public.personnel_education
     where personnel_id = $1
     order by completion_date desc nulls last, id`,
    [person.personnel_id],
  );

  const actual = await loadEducationForPersonnel(person.personnel_id);
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(
    expected.map((row) => ({
      id: row.id,
      name: row.name,
      completionDate: row.completion_date,
      credits: row.credits,
      sponsorName: row.sponsor_name,
      sponsorInstructor: row.sponsor_instructor,
    })),
  );
  expect(await loadEducationForPersonnel("no-such-personnel-id")).toEqual([]);
});
