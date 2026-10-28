import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAnnotations,
  filterAnnotations,
  annotationsCsv,
  annotationValue,
  isReportedDate,
  reportedDate,
  paginateAnnotations,
} from "../../src/lib/data/annotation-values.js";
const annotation = {
  field: "end_date",
  value: "2019-01-01",
  type: "error",
  message: "End precedes start.",
  source_namespace: "provider.a",
  source_record_id: "assignment-1",
};
test("canonical contract rejects missing attribution and malformed corrections", () => {
  assert.deepEqual(parseAnnotations([annotation]), [annotation]);
  assert.throws(() =>
    parseAnnotations([{ ...annotation, source_namespace: "" }]),
  );
  assert.throws(() =>
    parseAnnotations([{ ...annotation, type: "correction" }]),
  );
  assert.throws(() => parseAnnotations([{ ...annotation, extra: "hidden" }]));
});
test("all filtered rows are exported while the page has only 50 rows", () => {
  const entries = Array.from({ length: 125 }, (_, i) => ({
    ...annotation,
    canonical_id: String(i),
    entity_kind: "AgencyPersonnel",
    record_url: "/personnel/example/",
    record_label: "Example Officer",
    source_provider: "Provider A",
    source_record_id: String(i),
  }));
  const filtered = filterAnnotations(
    [...entries, { ...entries[0], source_namespace: "provider.b" }],
    "provider.a",
    "error",
  );
  assert.equal(paginateAnnotations(filtered, 1).length, 50);
  assert.equal(paginateAnnotations(filtered, 3).length, 25);
  assert.equal(annotationsCsv(filtered).split("\r\n").length, 127);
  assert.throws(() => paginateAnnotations(filtered, 0));
});
test("CSV quotes source text and losslessly encodes non-string values", () => {
  const csv = annotationsCsv([
    {
      ...annotation,
      value: { raw: [null, true, 3] },
      message: 'A,"quoted"\nline',
      canonical_id: "one",
      entity_kind: "Agency",
      record_url: "/tx/county/city/agency/",
      record_label: "Agency",
      source_provider: "Provider",
    },
  ]);
  assert.ok(csv.includes('"A,""quoted""\nline"'));
  assert.equal(
    annotationValue({ raw: [null, true, 3] }),
    '{"raw":[null,true,3]}',
  );
  assert.equal(annotationValue(null), "null");
});
test("source evidence distinguishes invalid dates from corrected nulls", () => {
  assert.equal(
    reportedDate(null, {
      value: "invalid",
      effective_value: "invalid",
      source_namespace: "provider.a",
      source_record_id: "one",
    }),
    "invalid",
  );
  assert.equal(
    reportedDate(null, {
      value: "invalid",
      effective_value: null,
      source_namespace: "provider.a",
      source_record_id: "one",
    }),
    null,
  );
});

test("calendar overflow is not formatted as a valid source date", () => {
  assert.equal(isReportedDate("2020-02-30"), false);
  assert.equal(isReportedDate("2020-02-29"), true);
});

test("history preserves invalid end-date evidence instead of claiming current employment", () => {
  const moduleUrl = new URL("../../src/lib/data.js", import.meta.url).href;
  const row = {
    id: "synthetic",
    start_date: "2020-01-01",
    end_date: null,
    data_source_values: {
      end_date: {
        value: "not a date",
        effective_value: "not a date",
        source_namespace: "synthetic.provider",
        source_record_id: "fixture",
      },
    },
  };
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { normalizeAgencyHistory } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(normalizeAgencyHistory([${JSON.stringify(row)}])));`,
    ],
    {
      env: process.env,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].end_date, "not a date");
});

test("database DATE objects retain their calendar date for display", () => {
  const start = reportedDate(new Date(2024, 5, 17));
  const end = reportedDate(new Date(2024, 5, 14));
  assert.equal(start, "2024-06-17");
  assert.equal(end, "2024-06-14");
});
