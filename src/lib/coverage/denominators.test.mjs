import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIENCE,
  CITATION_STATUS,
  CoverageProvenanceError,
  DEFINITIONAL_CONFLICTS,
  DENOMINATOR_LINEAGE,
  GAP_KIND,
  PRIMARY_NATIONAL_DENOMINATOR_ID,
  SECONDARY_NATIONAL_DENOMINATOR_ID,
  UNIVERSE,
  formatCoverage,
  formatDenominator,
  getDenominator,
  getStateDenominator,
  listStateDenominatorCodes,
  nationalCoverage,
  stateCoverage,
} from "./denominators.js";

const REPORT_YEAR = 2026;

test("the primary denominator is general-purpose CSLLEA 2018, cited inline", () => {
  const primary = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(primary.value, 14924);
  assert.equal(
    formatDenominator(primary),
    "14,924 general-purpose agencies (BJS Census of State and Local Law Enforcement Agencies, 2018)",
  );
});

test("a rendered coverage sentence always carries denominator, source, and year", () => {
  const result = formatCoverage({
    held: 2847,
    denominator: getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID),
    asOfYear: REPORT_YEAR,
  });

  assert.match(result.sentence, /2,847/);
  assert.match(result.sentence, /14,924/);
  assert.match(
    result.sentence,
    /BJS Census of State and Local Law Enforcement Agencies/,
  );
  assert.match(result.sentence, /2018/);
  assert.match(result.sentence, /19%/);
});

test("a 2018 denominator is never presented as a current count", () => {
  const result = formatCoverage({
    held: 2847,
    denominator: getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID),
    asOfYear: REPORT_YEAR,
  });

  assert.equal(result.stale, true);
  assert.equal(result.denominatorAgeYears, 8);
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

test("a derived subtotal must say what it was derived from", () => {
  const undocumented = {
    id: "z",
    value: 100,
    noun: "agencies",
    source: "Somewhere",
    year: 2018,
    citationStatus: CITATION_STATUS.CONFIRMED,
    derived: true,
    derivedFrom: null,
  };

  assert.throws(
    () => formatDenominator(undocumented),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /derived but does not record/.test(error.message),
  );
});

test("coverage cannot be reported against an unregistered denominator", () => {
  assert.throws(
    () => getDenominator("some_number_i_liked"),
    CoverageProvenanceError,
  );
});

test("the unpinned ~18,000 estimate is no longer registered at all", () => {
  assert.throws(
    () => getDenominator("all_agency_estimate"),
    CoverageProvenanceError,
  );
});

test("the all-agency figure now carries a real citation", () => {
  const secondary = getDenominator(SECONDARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(secondary.value, 17541);
  assert.equal(secondary.citationStatus, CITATION_STATUS.CONFIRMED);
  assert.equal(secondary.ncj, "NCJ 302187");
  assert.equal(secondary.derived, false);
  assert.match(
    formatDenominator(secondary, { audience: AUDIENCE.PUBLIC }),
    /^17,541 law enforcement agencies of all types \(BJS Census of State and Local Law Enforcement Agencies, 2018\)$/,
  );
});

test("the ~18,000 figure is pinned to CSLLEA 2008 and then retired, not just deleted", () => {
  const pinned = getDenominator("csllea_2008_all_agency");
  assert.equal(pinned.value, 17985);
  assert.equal(pinned.ncj, "NCJ 233982");
  assert.equal(pinned.citationStatus, CITATION_STATUS.SUPERSEDED);
  assert.equal(pinned.supersededById, SECONDARY_NATIONAL_DENOMINATOR_ID);
});

test("a superseded denominator cannot be published to the public", () => {
  const lear = getDenominator("lear_2016_general_purpose");
  assert.equal(lear.value, 15810);
  assert.equal(lear.citationStatus, CITATION_STATUS.SUPERSEDED);
  assert.equal(lear.supersededById, PRIMARY_NATIONAL_DENOMINATOR_ID);

  assert.throws(
    () => formatDenominator(lear, { audience: AUDIENCE.PUBLIC }),
    (error) =>
      error instanceof CoverageProvenanceError &&
      /has been superseded by "csllea_2018_general_purpose"/.test(
        error.message,
      ),
  );
});

test("the source swap travels with the report rather than sitting in a commit message", () => {
  const report = nationalCoverage({
    heldGeneralPurpose: 2847,
    heldAllAgency: 3110,
    asOfYear: REPORT_YEAR,
  });

  assert.equal(report.lineage, DENOMINATOR_LINEAGE);
  const swap = report.lineage.find(
    (entry) => entry.universe === UNIVERSE.GENERAL_PURPOSE,
  );
  assert.equal(swap.fromId, "lear_2016_general_purpose");
  assert.equal(swap.toId, PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(swap.issue, "INS-27");
});

test("national coverage reports both figures and still names the staleness gap", () => {
  const report = nationalCoverage({
    heldGeneralPurpose: 2847,
    heldAllAgency: 3110,
    asOfYear: REPORT_YEAR,
  });

  assert.equal(report.primary.denominatorId, PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.equal(
    report.secondary.denominatorId,
    SECONDARY_NATIONAL_DENOMINATOR_ID,
  );

  const kinds = report.gaps.map((gap) => gap.kind);
  assert.ok(kinds.includes(GAP_KIND.DENOMINATOR_STALE));
  assert.ok(!kinds.includes(GAP_KIND.CITATION_UNCONFIRMED));
  assert.equal(report.conflicts, DEFINITIONAL_CONFLICTS);
});

test("every state and DC has a denominator carrying its own source and year", () => {
  const codes = listStateDenominatorCodes();
  assert.equal(codes.length, 51);

  for (const code of codes) {
    for (const universe of Object.values(UNIVERSE)) {
      const denominator = getStateDenominator(code, universe);
      assert.ok(denominator, `${code}/${universe} has no denominator`);
      assert.equal(denominator.scope, code);
      assert.equal(denominator.year, 2018);
      assert.equal(
        denominator.source,
        "BJS Census of State and Local Law Enforcement Agencies",
      );
      assert.equal(denominator.citationStatus, CITATION_STATUS.CONFIRMED);
      assert.ok(Number.isInteger(denominator.value) && denominator.value > 0);
    }
  }
});

test("the loaded state counts reproduce the published national totals", () => {
  const codes = listStateDenominatorCodes();
  const sum = (fn) => codes.reduce((total, code) => total + fn(code), 0);

  const allAgency = sum(
    (code) => getStateDenominator(code, UNIVERSE.ALL_AGENCY).value,
  );
  const components = (code) =>
    getStateDenominator(code, UNIVERSE.GENERAL_PURPOSE).components;

  // BJS notes that details may not sum to totals: the state rows are survey
  // estimates. We assert the published residuals exactly, so that a transcription
  // error shows up as a failure instead of hiding inside "close enough".
  assert.equal(allAgency, 17540); // published U.S. total 17,541
  assert.equal(
    sum((code) => components(code).localPolice),
    11825,
  ); // published 11,824
  assert.equal(
    sum((code) => components(code).sheriffs),
    3054,
  ); // published 3,051
  assert.equal(
    sum((code) => components(code).primaryState),
    49,
  ); // published 49, exact
});

test("states with no sheriff's office record zero rather than a missing value", () => {
  for (const code of ["AK", "CT", "DE", "HI", "DC"]) {
    assert.equal(
      getStateDenominator(code, UNIVERSE.GENERAL_PURPOSE).components.sheriffs,
      0,
    );
  }
  // Hawaii has no state police department; DC is not a state.
  assert.equal(
    getStateDenominator("HI", UNIVERSE.GENERAL_PURPOSE).components.primaryState,
    0,
  );
  assert.equal(
    getStateDenominator("DC", UNIVERSE.GENERAL_PURPOSE).components.primaryState,
    0,
  );
  // Hawaii's four county police departments are its entire general-purpose universe.
  assert.equal(getStateDenominator("HI", UNIVERSE.GENERAL_PURPOSE).value, 4);
});

test("a state percentage is computed from that state's own denominator", () => {
  const texas = stateCoverage({
    stateCode: "tx",
    held: 520,
    asOfYear: REPORT_YEAR,
  });

  assert.equal(texas.gap, null);
  // 788 local police + 252 sheriffs' offices + 1 primary state = 1,041.
  assert.equal(texas.coverage.denominatorValue, 1041);
  assert.match(
    texas.coverage.sentence,
    /520 of 1,041 general-purpose agencies in TX/,
  );
  assert.match(texas.coverage.sentence, /50%/);
  // Not an apportioned share of the national figure.
  const national = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);
  assert.notEqual(texas.coverage.denominatorValue, national.value);
});

test("holding more agencies than the denominator counts is a named gap, not 100%+", () => {
  const wyoming = stateCoverage({
    stateCode: "WY",
    held: 200, // WY general-purpose denominator is 71
    asOfYear: REPORT_YEAR,
  });

  assert.equal(wyoming.coverage, null);
  assert.equal(wyoming.gap.kind, GAP_KIND.HELD_EXCEEDS_DENOMINATOR);
  assert.match(wyoming.gap.detail, /universe mismatch/);
  // The gap says "not coverage above 100%" in prose; what must not exist is a
  // computed percentage.
  assert.equal(Object.hasOwn(wyoming, "percent"), false);
  assert.match(wyoming.gap.detail, /no percentage is reported/);
});

test("an unknown state still returns a named gap rather than a percentage", () => {
  const guam = stateCoverage({
    stateCode: "GU",
    held: 12,
    asOfYear: REPORT_YEAR,
  });

  assert.equal(guam.coverage, null);
  assert.equal(guam.gap.kind, GAP_KIND.NO_STATE_DENOMINATOR);
  assert.match(guam.gap.detail, /not apportioned/);
  assert.equal(JSON.stringify(guam).includes("%"), false);
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
