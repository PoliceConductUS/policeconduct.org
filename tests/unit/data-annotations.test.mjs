import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import {
  annotationRecordLabel,
  annotationNoteLabel,
  parseAnnotations,
  annotationFromRecord,
  authorityAnnotations,
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

test("authority views include directly owned manual exclusions without claiming other manual records", () => {
  const entries = [
    {
      source_namespace: "provider",
      entity_kind: "Agency",
      canonical_id: "agency",
    },
    {
      source_namespace: "manual",
      entity_kind: "LicensingAuthority",
      canonical_id: "board",
    },
    {
      source_namespace: "manual",
      entity_kind: "LicensingAuthority",
      canonical_id: "other",
    },
    {
      source_namespace: "manual",
      entity_kind: "Agency",
      canonical_id: "board",
    },
  ];
  assert.deepEqual(
    authorityAnnotations(entries, ["provider"], "board"),
    entries.slice(0, 2),
  );
});

test("native annotation records preserve manual, source, and generated findings", () => {
  for (const producer_namespace of ["manual", "provider.a", "intake"]) {
    const record = {
      ...annotation,
      id: `annotation-${producer_namespace}`,
      subject_kind: "AgencyPersonnel",
      subject_id: "assignment",
      producer_namespace,
      producer_record_id: "one",
      status: "active",
      replacement_value: null,
      evidence: null,
    };
    assert.deepEqual(annotationFromRecord(record), annotation);
    assert.deepEqual(
      annotationFromRecord({
        ...record,
        type: "correction",
        replacement_value: null,
      }),
      {
        ...annotation,
        type: "correction",
        replacement_value: null,
      },
    );
  }
  assert.throws(() => annotationFromRecord({ ...annotation, message: "" }));
});

test("native warnings and errors retain supporting evidence", () => {
  for (const type of ["warning", "error"]) {
    const record = {
      ...annotation,
      type,
      evidence: [{ url: "https://example.invalid/evidence" }],
    };
    const parsed = annotationFromRecord(record);
    assert.deepEqual(parsed, record);
    const csv = annotationsCsv([
      {
        ...parsed,
        canonical_id: "assignment",
        entity_kind: "AgencyPersonnel",
        record_url: "/personnel/example/",
        record_label: "Example Officer",
        source_provider: "Provider A",
      },
    ]);
    const fields = [...csv.split("\r\n")[1].matchAll(/"((?:[^"]|"")*)"/g)].map(
      (match) => match[1].replaceAll('""', '"'),
    );
    assert.deepEqual(JSON.parse(fields.at(-1)), record.evidence);
  }
});

test("schema validation honors the explicit isolated database connection", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/validate-schema-contract.mjs"],
    {
      cwd: new URL("../../", import.meta.url),
      env: {
        ...process.env,
        DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/fixture",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ECONNREFUSED 127\.0\.0\.1:1/);
});

test("exclusions display their original subject and explicit duplicate reason", () => {
  const entry = {
    ...annotation,
    type: "warning",
    field: "excluded_records",
    value: { kind: "Agency", key: "source-1", name: "Excluded Agency" },
    message: "Explicitly excluded Agency: User-retired duplicate page",
    record_label: "Licensing Board",
  };
  assert.equal(annotationRecordLabel(entry), "Excluded Agency");
  assert.equal(annotationNoteLabel(entry), "Excluded duplicate");
  assert.equal(
    annotationNoteLabel({
      ...entry,
      message: "Explicitly excluded Agency: Administrative placeholder",
    }),
    "Excluded record",
  );
  assert.equal(
    annotationRecordLabel({
      ...entry,
      value: { kind: "Agency", key: "source-1" },
    }),
    "Agency source-1",
  );
});
