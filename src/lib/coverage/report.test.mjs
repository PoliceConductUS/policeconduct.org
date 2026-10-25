import assert from "node:assert/strict";
import test from "node:test";

import { GAP_KIND } from "./denominators.js";
import { measureHeldAgencies } from "./held-counts.js";
import { buildCoverageReport, renderCoverageReportMarkdown } from "./report.js";

/**
 * A pg-shaped stub. Matching on SQL substrings keeps the tests honest about
 * which query produced which number.
 */
const fakeClient = ({
  stateRows,
  hasFederalParent = true,
  hasPagePayload = true,
  federalHeld = 0,
  published = 0,
  /**
   * The schema signature `verifyAuthoritativeStore` reads. Defaults to the
   * authoritative store so that existing tests describe the normal case; the
   * legacy corpus is modelled by overriding these.
   */
  signatureTables = ["agency", "personnel", "build_page_payload"],
  signatureColumns = ["agency.parent_federal_agency_id", "agency.status"],
  fingerprint = {
    rows: 0,
    newest_updated_at: "2026-10-24T00:00:00.000Z",
    oldest_created_at: "2025-01-01T00:00:00.000Z",
  },
}) => ({
  query: async (sql, params) => {
    // The signature probes list the whole schema; the optional-feature probes
    // ask about one name with a bound parameter. Split on that, not on the
    // table being queried, since both read information_schema.
    if (sql.includes("information_schema.tables") && !sql.includes("$1")) {
      return { rows: signatureTables.map((table) => ({ table_name: table })) };
    }
    if (sql.includes("information_schema.columns") && !sql.includes("$1")) {
      return {
        rows: signatureColumns.map((key) => {
          const [table_name, column_name] = key.split(".");
          return { table_name, column_name };
        }),
      };
    }
    if (sql.includes("information_schema.columns")) {
      return { rows: hasFederalParent && params[1] ? [{ "?column?": 1 }] : [] };
    }
    if (sql.includes("information_schema.tables")) {
      return { rows: hasPagePayload ? [{ "?column?": 1 }] : [] };
    }
    if (sql.includes("current_database()")) {
      return {
        rows: [{ database: "policeconduct", host: "127.0.0.1", port: 55432 }],
      };
    }
    if (sql.includes("max(updated_at)")) {
      return {
        rows: [
          { ...fingerprint, rows: stateRows.reduce((s, r) => s + r.held, 0) },
        ],
      };
    }
    if (sql.includes("group by upper(btrim(state))")) {
      return { rows: stateRows.map((row) => ({ ...row })) };
    }
    if (sql.includes("parent_federal_agency_id is not null")) {
      return { rows: [{ held: federalHeld }] };
    }
    if (sql.includes("build_page_payload")) {
      return { rows: [{ published }] };
    }
    throw new Error(`unexpected query: ${sql}`);
  },
});

const measure = (options) =>
  measureHeldAgencies(fakeClient(options), {
    now: new Date("2026-10-24T12:00:00.000Z"),
  });

const build = async (options, reportOptions = {}) =>
  buildCoverageReport({
    measurement: await measure(options),
    asOf: new Date("2026-10-24T12:00:00.000Z"),
    ...reportOptions,
  });

const stateIn = (report, code) =>
  report.states.find((state) => state.code === code);

test("reports no achieved coverage percentage anywhere", async () => {
  const report = await build({
    stateRows: [
      { code: "TX", held: 2883 },
      { code: "MN", held: 394 },
      { code: "VA", held: 5 },
    ],
  });

  assert.equal(report.summary.achievedPercentagesReported, 0);
  for (const state of report.states) {
    for (const reading of [state.generalPurpose, state.allAgency]) {
      if (reading.ceiling) {
        assert.equal(
          reading.ceiling.isCeiling,
          true,
          `${state.code} produced a non-ceiling coverage figure`,
        );
      }
    }
  }
});

test("holding more than the denominator is a universe mismatch, not 100%+ coverage", async () => {
  const report = await build({ stateRows: [{ code: "TX", held: 2883 }] });
  const texas = stateIn(report, "TX");

  // TX all-agency denominator is 1,935; we hold more than that.
  assert.equal(texas.allAgency.ceiling, null);
  assert.equal(texas.allAgency.gap.kind, GAP_KIND.HELD_EXCEEDS_DENOMINATOR);
  assert.equal(texas.generalPurpose.ceiling, null);
  assert.equal(
    texas.generalPurpose.gap.kind,
    GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
  );
  assert.match(texas.allAgency.gap.detail, /universe mismatch/);
  // 2,883 / 1,935 is 149%. No computed ratio may appear — the only percentage
  // allowed in this string is the literal "above 100%" that denies one.
  assert.doesNotMatch(texas.allAgency.gap.detail, /\b(?!100\b)\d+(\.\d+)?%/);
  assert.doesNotMatch(texas.allAgency.gap.detail, /149/);
});

test("a ceiling carries its denominator's source, year and the universe caveat", async () => {
  const report = await build({ stateRows: [{ code: "VA", held: 5 }] });
  const { ceiling } = stateIn(report, "VA").generalPurpose;

  assert.ok(ceiling, "Virginia should produce a ceiling");
  assert.match(ceiling.sentence, /^No more than/);
  assert.match(
    ceiling.sentence,
    /BJS Census of State and Local Law Enforcement/,
  );
  assert.match(ceiling.sentence, /2018/);
  assert.match(ceiling.sentence, /ceiling and not a coverage figure/);
});

test("a state with a denominator and no records is a named gap, not a zero row", async () => {
  const report = await build({ stateRows: [{ code: "TX", held: 2883 }] });
  const alaska = stateIn(report, "AK");

  assert.equal(alaska.held, 0);
  const gap = alaska.gaps.find((g) => g.kind === GAP_KIND.NO_RECORDS_HELD);
  assert.ok(gap, "expected a nothing-held gap for AK");
  assert.match(gap.detail, /complete gap, not a low coverage figure/);
  assert.match(gap.unblockedBy, /INS-12/);
  assert.ok(report.summary.jurisdictionsWithoutRecords >= 50);
});

test("a state we hold nothing in never renders as a 0% ceiling", async () => {
  const report = await build({ stateRows: [{ code: "TX", held: 2883 }] });
  const markdown = renderCoverageReportMarkdown(report);

  for (const state of report.states) {
    if (state.held === 0) {
      assert.equal(
        state.generalPurpose.ceiling,
        null,
        `${state.code} held nothing but produced a ceiling`,
      );
      assert.equal(state.allAgency.ceiling, null);
    }
  }
  // "≤ 0.0%" is arithmetically true and reads as a measurement of a thin
  // corpus rather than the absence of one.
  assert.doesNotMatch(markdown, /≤ 0\.0%/);
  assert.match(
    markdown,
    /\| AK \| 0 \| 38 \| 49 \| nothing held \| nothing held \|/,
  );
});

test("the measurement records the address actually dialled, not just the server's own", async () => {
  const measurement = await measureHeldAgencies(
    fakeClient({ stateRows: [{ code: "TX", held: 1 }] }),
    {
      now: new Date("2026-10-24T12:00:00.000Z"),
      connectionTarget: "127.0.0.1:54322/postgres",
    },
  );

  assert.equal(measurement.database.connectedTo, "127.0.0.1:54322/postgres");
  const markdown = renderCoverageReportMarkdown(
    buildCoverageReport({ measurement, asOf: new Date("2026-10-24") }),
  );
  assert.match(markdown, /dialled at 127\.0\.0\.1:54322\/postgres/);
});

test("a jurisdiction we hold records in but have no denominator for still appears", async () => {
  const report = await build({
    stateRows: [
      { code: "TX", held: 10 },
      { code: "PR", held: 3 },
    ],
  });
  const puertoRico = stateIn(report, "PR");

  assert.ok(puertoRico, "PR must not fall out of the report");
  assert.equal(puertoRico.held, 3);
  assert.equal(
    puertoRico.generalPurpose.gap.kind,
    GAP_KIND.NO_STATE_DENOMINATOR,
  );
  assert.match(puertoRico.generalPurpose.gap.detail, /not apportioned/);
});

test("an unidentified store's count is a reported finding", async () => {
  const report = await build(
    { stateRows: [{ code: "TX", held: 2883 }] },
    {
      corpusCrossChecks: [
        { store: "some other database", count: 3003 },
        { store: "agreeing store", count: 2883 },
      ],
    },
  );

  const gap = report.gaps.find(
    (g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED,
  );
  assert.ok(gap, "expected a disputed-count gap");
  assert.match(gap.detail, /some other database reports 3,003/);
  assert.match(gap.detail, /cannot say what store that is/);
  assert.doesNotMatch(gap.detail, /agreeing store/);
  assert.match(gap.detail, /single source of record/);
  assert.equal(report.corpusCrossChecks[0].status, "unrecorded");
});

test("an abandoned store's count is never a finding, whatever number it reports", async () => {
  // The board's ruling: intake is the only path that populates the database, so
  // the legacy dump is not a rival count. Both the real row count and the long-
  // quoted statement count must be treated the same way — as not a count.
  for (const count of [3008, 3003]) {
    const report = await build(
      { stateRows: [{ code: "TX", held: 3538 }], published: 3393 },
      { corpusCrossChecks: [{ store: "legacy seed.sql dump", count }] },
    );

    assert.equal(
      report.gaps.find((g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED),
      undefined,
      `an abandoned store reporting ${count} must not raise a dispute`,
    );
    const [check] = report.corpusCrossChecks;
    assert.equal(check.status, "abandoned");
    // The label must survive the classification spread, not be shadowed by it.
    assert.equal(check.store, "legacy seed.sql dump");

    const markdown = renderCoverageReportMarkdown(report);
    assert.match(
      markdown,
      new RegExp(
        `legacy seed\\.sql dump\\*\\*: ${count.toLocaleString("en-US")} — abandoned`,
      ),
    );
    assert.match(markdown, /not a count of record/);
  }
});

test("the derived projection is checked against what this report measured", async () => {
  const report = await build(
    { stateRows: [{ code: "TX", held: 3538 }], published: 3393 },
    {
      corpusCrossChecks: [
        { store: "build_page_payload agency pages", count: 3393 },
      ],
    },
  );

  assert.equal(
    report.gaps.find((g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED),
    undefined,
    "a projection that matches the measured published count is not a finding",
  );
  assert.equal(report.corpusCrossChecks[0].status, "derived");
});

test("a projection that disagrees with the store it projects is a finding", async () => {
  // This is the one comparison still worth making under a single source: the
  // projection is derived from the store, so it cannot legitimately differ.
  const report = await build(
    { stateRows: [{ code: "TX", held: 3538 }], published: 3393 },
    {
      corpusCrossChecks: [
        { store: "build_page_payload agency pages", count: 3000 },
      ],
    },
  );

  const gap = report.gaps.find(
    (g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED,
  );
  assert.ok(gap, "a drifted projection must be reported");
  assert.match(gap.detail, /reports 3,000, but this report measured 3,393/);
  assert.match(gap.detail, /cannot disagree with the store it projects/);
  assert.match(gap.unblockedBy, /refresh-build-projections/);
  assert.equal(report.corpusCrossChecks[0].status, "derived_drifted");
});

test("a projection cannot be confirmed when the published count is unavailable", async () => {
  // Absence of the projection table must not read as agreement.
  const report = await build(
    {
      stateRows: [{ code: "TX", held: 3538 }],
      hasPagePayload: false,
    },
    {
      corpusCrossChecks: [
        { store: "build_page_payload agency pages", count: 3393 },
      ],
    },
  );

  const gap = report.gaps.find(
    (g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED,
  );
  assert.ok(gap, "an unverifiable projection is a finding, not a pass");
  assert.match(gap.detail, /could not measure the published-page count/);
  assert.equal(report.corpusCrossChecks[0].status, "derived_drifted");
});

test("measuring the authoritative store raises no authority gap and says so", async () => {
  const report = await build({ stateRows: [{ code: "TX", held: 3538 }] });

  assert.equal(report.measurement.storeAuthority.isAuthoritative, true);
  assert.equal(
    report.gaps.find(
      (g) => g.kind === GAP_KIND.MEASURED_STORE_NOT_AUTHORITATIVE,
    ),
    undefined,
  );
  const markdown = renderCoverageReportMarkdown(report);
  assert.match(markdown, /the single source of record for\s+agency counts/);
  // The point of the ruling: no second store to reconcile against.
  assert.match(markdown, /no second store to\s+reconcile against/);
});

test("the legacy corpus is detected by its pre-rename tables, not by its address", async () => {
  // The seed dump's defining feature: it predates the officers-to-personnel
  // rename. Measuring it must not be allowed to answer as the corpus count,
  // even though every count it returns is internally consistent.
  const report = await build({
    stateRows: [{ code: "TX", held: 2937 }],
    signatureTables: ["agency", "officers", "agency_officers"],
    signatureColumns: [],
  });

  const gap = report.gaps.find(
    (g) => g.kind === GAP_KIND.MEASURED_STORE_NOT_AUTHORITATIVE,
  );
  assert.ok(gap, "expected a store-authority gap");
  assert.match(gap.detail, /pre-rename officers, agency_officers/);
  assert.match(gap.detail, /personnel, build_page_payload/);
  assert.match(gap.detail, /none of them is the corpus count/);
  assert.match(
    renderCoverageReportMarkdown(report),
    /\*\*This is not the intake agency corpus\*\*/,
  );
});

test("agreeing stores raise no dispute", async () => {
  const report = await build(
    { stateRows: [{ code: "TX", held: 2883 }] },
    { corpusCrossChecks: [{ store: "another store", count: 2883 }] },
  );
  assert.equal(
    report.gaps.find((g) => g.kind === GAP_KIND.CORPUS_COUNT_DISPUTED),
    undefined,
  );
});

const universeGap = (report) =>
  report.gaps.find((g) => g.kind === GAP_KIND.NUMERATOR_UNIVERSE_UNVERIFIED);

/** A state whose every held agency carries a sourced type. */
const classifiedState = ({
  code,
  generalPurposeHeld,
  allAgencyHeld,
  held = allAgencyHeld,
}) => ({
  code,
  held,
  generalPurposeHeld,
  allAgencyHeld,
  unclassifiedHeld: 0,
  numeratorComplete: true,
  byCategory: {},
});

test("the unverified numerator universe is reported while agencies are untyped", async () => {
  const report = await build({ stateRows: [{ code: "VA", held: 5 }] });
  const gap = universeGap(report);
  assert.ok(gap);
  assert.match(gap.detail, /carry no sourced agency type/);
  assert.match(gap.detail, /VA/);
  assert.match(gap.unblockedBy, /Name matching is not a substitute/);
});

test("the unverified numerator gap disappears only when nothing is untyped", async () => {
  // The paired half of the test above. Without this, the assertion that the
  // gap is present would still pass if the gap were unconditional again.
  const report = await build(
    { stateRows: [{ code: "MN", held: 394 }] },
    {
      classification: [
        classifiedState({
          code: "MN",
          held: 394,
          generalPurposeHeld: 300,
          allAgencyHeld: 390,
        }),
      ],
    },
  );
  assert.equal(universeGap(report), undefined);
  assert.equal(report.summary.unclassifiedHeld, 0);
});

test("a fully classified state reports achieved coverage, not a ceiling", async () => {
  const report = await build(
    { stateRows: [{ code: "MN", held: 394 }] },
    {
      classification: [
        classifiedState({
          code: "MN",
          held: 394,
          // MN denominators are 392 general-purpose and 417 all-agency.
          generalPurposeHeld: 196,
          allAgencyHeld: 300,
        }),
      ],
    },
  );
  const mn = stateIn(report, "MN");
  assert.ok(mn.generalPurpose.coverage, "expected an achieved percentage");
  assert.equal(mn.generalPurpose.ceiling, null);
  assert.equal(mn.generalPurpose.coverage.held, 196);
  assert.equal(Math.round(mn.generalPurpose.coverage.percent), 50);
  assert.equal(report.summary.achievedPercentagesReported, 2);
  assert.equal(report.summary.jurisdictionsFullyClassified, 1);
});

test("one untyped agency sends the whole state back to a ceiling", async () => {
  const report = await build(
    { stateRows: [{ code: "MN", held: 394 }] },
    {
      classification: [
        {
          ...classifiedState({
            code: "MN",
            held: 394,
            generalPurposeHeld: 196,
            allAgencyHeld: 300,
          }),
          unclassifiedHeld: 1,
          numeratorComplete: false,
        },
      ],
    },
  );
  const mn = stateIn(report, "MN");
  assert.equal(mn.generalPurpose.coverage, null);
  assert.equal(report.summary.achievedPercentagesReported, 0);
  assert.ok(universeGap(report));
});

test("a classified numerator over the denominator is still never a percentage", async () => {
  // Texas as it actually measures: the numerator is now the right population
  // and still exceeds a 2018 count. That is a gap, not 102% coverage.
  const report = await build(
    { stateRows: [{ code: "TX", held: 2883 }] },
    {
      classification: [
        classifiedState({
          code: "TX",
          held: 2883,
          generalPurposeHeld: 1064,
          allAgencyHeld: 2559,
        }),
      ],
    },
  );
  const tx = stateIn(report, "TX");
  assert.equal(tx.generalPurpose.coverage, null);
  assert.equal(tx.generalPurpose.ceiling, null);
  const gap = tx.gaps.find((g) => g.kind === GAP_KIND.HELD_EXCEEDS_DENOMINATOR);
  assert.ok(gap);
  assert.match(gap.detail, /carry a sourced type/);
  assert.match(gap.unblockedBy, /full-time-equivalent/);
});

test("missing optional columns become recorded limitations, not crashes", async () => {
  const measurement = await measure({
    stateRows: [{ code: "TX", held: 10 }],
    hasFederalParent: false,
    hasPagePayload: false,
  });

  assert.equal(measurement.federalHeld, null);
  assert.equal(measurement.publishedAsPages, null);
  assert.equal(measurement.limitations.length, 2);
  assert.match(measurement.limitations[0].consequence, /inflate the numerator/);
  assert.match(
    measurement.limitations[1].consequence,
    /not the same as published/,
  );
});

test("every measurement records the store it came from and a fingerprint", async () => {
  const measurement = await measure({ stateRows: [{ code: "TX", held: 10 }] });

  assert.equal(measurement.database.database, "policeconduct");
  assert.equal(measurement.database.port, 55432);
  assert.equal(measurement.measuredAt, "2026-10-24T12:00:00.000Z");
  assert.equal(measurement.fingerprint.rows, 10);
  assert.ok(measurement.fingerprint.newest_updated_at);
});

test("the rendered report names the store, the fingerprint and both denominators", async () => {
  const report = await build({
    stateRows: [
      { code: "TX", held: 2883 },
      { code: "VA", held: 5 },
    ],
    published: 2800,
    federalHeld: 11,
  });
  const markdown = renderCoverageReportMarkdown(report);

  assert.match(markdown, /# Agency coverage report v1/);
  assert.match(markdown, /database `policeconduct`/);
  assert.match(markdown, /server reports itself as 127\.0\.0\.1:55432/);
  assert.match(markdown, /Corpus fingerprint/);
  // One staleness finding, not one per denominator drawn from the same source.
  assert.equal(markdown.match(/\*\*denominator stale\*\*/g).length, 1);
  assert.match(markdown, /contains no achieved coverage percentage/);
  // Both figures, primary first, neither instead of the other.
  assert.match(markdown, /14,924 general-purpose agencies/);
  assert.match(markdown, /17,541 law enforcement agencies of all types/);
  // Held is not published.
  assert.match(markdown, /2,800.*held is not the same as published/);
  assert.match(
    markdown,
    /Federal agency records included in that total: \*\*11\*\*/,
  );
  // Gaps are rendered with their remedy, so the report directs work.
  assert.match(markdown, /Unblocked by:/);
  assert.match(markdown, /Nothing held — \d+ jurisdictions/);
  assert.match(markdown, /universe mismatch/);
  // Conflicts are carried, not smoothed over.
  assert.match(markdown, /local_police_count_lear_vs_csllea/);
  assert.match(
    markdown,
    /lear_2016_general_purpose` → `csllea_2018_general_purpose/,
  );
});

test("state counts fold case and whitespace so one state cannot split into two rows", async () => {
  // The grouping is done in SQL, so this asserts the query shape rather than
  // re-implementing it: the column list must be the folded expression.
  const seen = [];
  const client = {
    query: async (sql, params) => {
      seen.push(sql);
      if (sql.includes("information_schema")) {
        return { rows: params ? [] : [] };
      }
      if (sql.includes("current_database()")) {
        return { rows: [{ database: "d", host: "h", port: 1 }] };
      }
      if (sql.includes("max(updated_at)")) {
        return { rows: [{ rows: 0, newest_updated_at: null }] };
      }
      return { rows: [] };
    },
  };
  await measureHeldAgencies(client);

  const grouping = seen.find((sql) => sql.includes("from public.agency\n"));
  assert.match(grouping, /upper\(btrim\(state\)\)/);
  assert.match(grouping, /group by upper\(btrim\(state\)\)/);
});
