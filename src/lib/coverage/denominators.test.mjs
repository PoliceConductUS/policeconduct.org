import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIENCE,
  CITATION_STATUS,
  CoverageProvenanceError,
  GAP_KIND,
  PRIMARY_NATIONAL_DENOMINATOR_ID,
  SECONDARY_NATIONAL_DENOMINATOR_ID,
  formatCoverage,
  formatDenominator,
  getDenominator,
  getStateDenominator,
  nationalCoverage,
  stateCoverage,
} from "./denominators.js";

const REPORT_YEAR = 2026;

test("the primary denominator is general-purpose LEAR 2016, cited inline", () => {
  const primary = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(primary.value, 15810);
  assert.equal(
    formatDenominator(primary),
    "15,810 general-purpose agencies (BJS Law Enforcement Agency Roster, 2016)",
  );
});

test("a rendered coverage sentence always carries denominator, source, and year", () => {
  const result = formatCoverage({
    held: 2847,
    denominator: getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID),
    asOfYear: REPORT_YEAR,
  });

  assert.match(result.sentence, /2,847/);
  assert.match(result.sentence, /15,810/);
  assert.match(result.sentence, /BJS Law Enforcement Agency Roster/);
  assert.match(result.sentence, /2016/);
  assert.match(result.sentence, /18%/);
});

test("a 2016 denominator is never presented as a current count", () => {
  const result = formatCoverage({
    held: 2847,
    denominator: getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID),
    asOfYear: REPORT_YEAR,
  });

  assert.equal(result.stale, true);
  assert.equal(result.denominatorAgeYears, 10);
  assert.match(result.sentence, /not a current count/);
});

test("a denominator with no source or no year cannot be rendered at all", () => {
  const confirmed = { citationStatus: CITATION_STATUS.CONFIRMED };
  const sourceless = {
    id: "x",
    value: 100,
    noun: "agencies",
    year: 2016,
    ...confirmed,
  };
  const yearless = {
    id: "y",
    value: 100,
    noun: "agencies",
    source: "Somewhere",
    ...confirmed,
  };

  assert.throws(
    () => formatDenominator(sourceless),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /no source/.test(error.message),
  );
  assert.throws(
    () => formatDenominator(yearless),
    (error) =>
      error instanceof CoverageProvenanceError && /no year/.test(error.message),
  );
});

test("coverage cannot be reported against an unregistered denominator", () => {
  assert.throws(
    () => getDenominator("some_number_i_liked"),
    CoverageProvenanceError,
  );
});

test("the ~18,000 all-agency estimate is blocked from output until it is pinned", () => {
  const secondary = getDenominator(SECONDARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(secondary.citationStatus, CITATION_STATUS.PENDING);

  assert.throws(
    () => formatDenominator(secondary, { audience: AUDIENCE.PUBLIC }),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /may not be published to a public audience/.test(error.message),
  );

  // Internally it is blocked too: the ~18,000 figure is widely repeated but has
  // never been pinned to a publication or a vintage, and the registry does not
  // carry an attribution nobody has checked.
  assert.equal(secondary.source, null);
  assert.equal(secondary.year, null);
  assert.throws(
    () => formatDenominator(secondary, { audience: AUDIENCE.INTERNAL }),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /no source/.test(error.message),
  );
});

test("national coverage reports the secondary figure's absence as a named gap, not silence", () => {
  const report = nationalCoverage({
    heldGeneralPurpose: 2847,
    heldAllAgency: 3110,
    asOfYear: REPORT_YEAR,
  });

  assert.equal(report.primary.denominatorId, PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(report.secondary, null);

  const kinds = report.gaps.map((gap) => gap.kind);
  assert.ok(kinds.includes(GAP_KIND.CITATION_UNCONFIRMED));
  assert.ok(kinds.includes(GAP_KIND.DENOMINATOR_STALE));
});

test("no state denominators are on file, so no state percentage is produced", () => {
  assert.equal(getStateDenominator("TX"), null);

  const texas = stateCoverage({
    stateCode: "TX",
    held: 2847,
    asOfYear: REPORT_YEAR,
  });
  assert.equal(texas.coverage, null);
  assert.equal(texas.gap.kind, GAP_KIND.NO_STATE_DENOMINATOR);
  assert.match(texas.gap.detail, /2,847 agencies held in TX/);
  assert.match(texas.gap.detail, /not apportioned/);
  assert.match(texas.gap.unblockedBy, /per-state general-purpose counts/);
});

test("a state result never contains a percentage without a state denominator", () => {
  const texas = stateCoverage({
    stateCode: "tx",
    held: 2847,
    asOfYear: REPORT_YEAR,
  });
  assert.equal(JSON.stringify(texas).includes("%"), false);
});

test("coverage requires a real numerator and a report year", () => {
  const denominator = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);

  assert.throws(
    () => formatCoverage({ held: -1, denominator, asOfYear: REPORT_YEAR }),
    CoverageProvenanceError,
  );
  assert.throws(
    () => formatCoverage({ held: 10, denominator }),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /staleness/.test(error.message),
  );
});
