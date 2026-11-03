import assert from "node:assert/strict";
import { withDb } from "../src/lib/db.js";

await withDb(async (client) => {
  const { rows } = await client.query(`
    select
      payload.entity_id,
      payload.payload->>'title' as projected_title,
      report.title as report_title,
      not exists (
        select 1
        from jsonb_array_elements(payload.payload->'personnel') person
        where (person->>'title') is distinct from (
          select nullif(assignment.title, '')
          from public.personnel personnel
          join public.agency_personnel assignment on assignment.personnel_id = personnel.id
          join public.review_personnel link on link.agency_personnel_id = assignment.id
          where personnel.slug = person->>'slug' and link.review_id = report.id
          order by link.id
          limit 1
        )
      ) as personnel_titles_match
    from public.build_page_payload payload
    join public.reviews report on report.id = payload.entity_id
    where payload.page_type = 'report_summary'
  `);
  assert.ok(rows.length > 0, "No report projections checked.");
  for (const row of rows) {
    assert.equal(
      row.projected_title,
      row.report_title,
      "Report projection must preserve the report title, not a personnel title.",
    );
    assert.ok(
      row.personnel_titles_match,
      "Personnel titles must stay separate.",
    );
  }
  console.log(
    `Verified report and personnel titles in ${rows.length} projections.`,
  );
});
