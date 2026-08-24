import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  AGENCY_OFFICER_COLUMNS,
  assertNoSuppressedColumns,
  projection,
  publishableColumns,
} from "../src/lib/data/personnel-projection.ts";
import {
  SUBMISSION_FORM_PATHS,
  distPath,
  findRenderedLeaks,
  findWildcardPersonnelReads,
  readSuppressedColumns,
} from "./validate-personnel-suppression.mjs";

const projectionSource = await fs.readFile(
  path.resolve("src/lib/data/personnel-projection.ts"),
  "utf8",
);

const BADGE = [{ table: "agency_officers", column: "badge_number" }];

test("the suppression list parses out of the projection module", () => {
  // Pins the parse. If a refactor breaks it, this fails rather than letting the
  // validator silently check an empty list.
  assert.deepEqual(readSuppressedColumns(projectionSource), BADGE);
});

test("an empty or missing suppression list is an error, not a pass", () => {
  assert.throws(
    () => readSuppressedColumns("export const SOMETHING_ELSE = 1;"),
    /Could not find SUPPRESSED_COLUMNS/,
  );
  assert.throws(
    () =>
      readSuppressedColumns(
        "export const SUPPRESSED_COLUMNS = Object.freeze({\n  // nothing\n});",
      ),
    /parsed as empty/,
  );
});

test("the SQL projection omits badge_number and keeps the other columns", () => {
  // badge_number is a real column of the table, and still never selected. The
  // value does not leave Postgres, so no template can leak it.
  assert.ok(AGENCY_OFFICER_COLUMNS.includes("badge_number"));
  assert.ok(!publishableColumns("agency_officers").includes("badge_number"));
  assert.equal(
    projection("agency_officers", "ao"),
    "ao.id, ao.agency_id, ao.officer_id, ao.license_type, ao.start_date, ao.end_date",
  );
  // start_date stays published: INS-34 scopes it out, it is INS-11 §3
  // remediation on the measured clock, not a deploy condition.
  assert.ok(publishableColumns("agency_officers").includes("start_date"));
});

test("a row carrying a suppressed column fails the build", () => {
  assert.doesNotThrow(() =>
    assertNoSuppressedColumns("agency_officers", [
      { id: "a", license_type: "Peace Officer" },
    ]),
  );
  assert.throws(
    () =>
      assertNoSuppressedColumns("agency_officers", [
        { id: "a", badge_number: "4417" },
      ]),
    /Suppressed field agency_officers\.badge_number reached a published page/,
  );
  // A null value still fails: the key's presence is what leaks the field.
  assert.throws(
    () =>
      assertNoSuppressedColumns("agency_officers", [
        { id: "a", badge_number: null },
      ]),
    /Suppressed field/,
  );
});

test("reading a table with no declared projection is an error", () => {
  assert.throws(
    () => projection("reviews", "r"),
    /No personnel projection is defined for table reviews/,
  );
});

test("wildcard reads of personnel tables are caught", () => {
  assert.deepEqual(
    findWildcardPersonnelReads(
      "select * from public.agency_officers where officer_id = $1",
    ).map((finding) => finding.table),
    ["agency_officers"],
  );
  assert.deepEqual(
    findWildcardPersonnelReads(
      "select ao.* from public.agency_officers ao",
    ).map((finding) => finding.table),
    ["agency_officers"],
  );
  assert.deepEqual(
    findWildcardPersonnelReads("select o.* from public.officers o").map(
      (finding) => finding.table,
    ),
    ["officers"],
  );
});

test("named projections and neighbouring tables are not flagged", () => {
  assert.deepEqual(
    findWildcardPersonnelReads(
      "select ao.id, ao.license_type from public.agency_officers ao",
    ),
    [],
  );
  // Distinct tables whose names merely start with a personnel table name.
  assert.deepEqual(
    findWildcardPersonnelReads("select * from public.officers_stats"),
    [],
  );
  assert.deepEqual(
    findWildcardPersonnelReads("select * from public.review_officers"),
    [],
  );
  // A `select *` in one SQL string must not pair with a `from` in the next.
  assert.deepEqual(
    findWildcardPersonnelReads(
      '"select * from public.tags",\n  `select o.id from public.officers o`',
    ),
    [],
  );
});

test("a badge value in an inline payload is a rendered leak", () => {
  // The INS-34 failure mode: hidden from the reader, present in page source.
  assert.deepEqual(
    findRenderedLeaks('{"officerName":"A B","badgeNumber":"4417"}', BADGE),
    ['inline payload badgeNumber="4417"'],
  );
});

test("an empty badge key in a payload is not a leak", () => {
  assert.deepEqual(
    findRenderedLeaks('{"badgeNumber":"","officerName":"A B"}', BADGE),
    [],
  );
});

test("visible badge labels and raw column names are rendered leaks", () => {
  assert.deepEqual(findRenderedLeaks('<th scope="col">Badge</th>', BADGE), [
    'badge surface ">Badge<"',
  ]);
  assert.equal(findRenderedLeaks("<div> Badge # </div>", BADGE).length, 1);
  assert.equal(findRenderedLeaks('{"badge_number":null}', BADGE).length, 1);
});

test("unrelated uses of the word badge are not flagged", () => {
  // Bootstrap pill classes and the rating badge component are everywhere.
  assert.deepEqual(
    findRenderedLeaks(
      '<span class="badge bg-dark rounded-0">Active</span>',
      BADGE,
    ),
    [],
  );
  assert.deepEqual(
    findRenderedLeaks('<span class="rating-badge-good">Good</span>', BADGE),
    [],
  );
});

test("nothing is checked when the field is not suppressed", () => {
  assert.deepEqual(findRenderedLeaks('{"badgeNumber":"4417"}', []), []);
});

test("submission forms are exempt by exact path, never by prefix", () => {
  assert.equal(
    distPath("/tmp/dist", "/tmp/dist/report/new/index.html"),
    "/report/new/index.html",
  );
  assert.ok(SUBMISSION_FORM_PATHS.has("/report/new/index.html"));
  // A record page under an exempt prefix must still be scanned.
  assert.ok(
    !SUBMISSION_FORM_PATHS.has("/personnel/new-officer-abc123/index.html"),
  );
  for (const exempt of SUBMISSION_FORM_PATHS) {
    assert.ok(
      exempt.endsWith("/index.html"),
      `${exempt} must be an exact page path`,
    );
  }
});
