import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AgencyTypeProvenanceError,
  ALL_AGENCY_CATEGORIES,
  BJS_CATEGORY,
  CLASSIFICATION_SOURCE,
  GENERAL_PURPOSE_CATEGORIES,
  PRIMARY_STATE_AGENCY,
  TCOLE_DEPARTMENT_TYPE_MAP,
  UnknownSourceTypeError,
  assertClassificationPublishable,
  classifyTcoleDepartmentType,
  normalizeAgencyName,
  summarizeClassifications,
} from "./agency-types.js";
import {
  UNCLASSIFIED_REASON,
  classifyHeldAgencies,
} from "./classify-held-agencies.js";

const roster = JSON.parse(
  readFileSync(
    new URL("./data/tcole-department-types.json", import.meta.url),
    "utf8",
  ),
);

const provenance = {
  sourceDataset: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10.sourceDataset,
  recordsRequestId: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10.recordsRequestId,
  retrievedOn: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10.retrievedOn,
  sourceField: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10.sourceField,
  confidence: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10.confidence,
};

test("general-purpose is local police, sheriffs and primary state — not constables", () => {
  assert.deepEqual([...GENERAL_PURPOSE_CATEGORIES].sort(), [
    BJS_CATEGORY.LOCAL_POLICE,
    BJS_CATEGORY.PRIMARY_STATE,
    BJS_CATEGORY.SHERIFF,
  ]);
  // The single most consequential mapping decision in Texas: 742 constable and
  // marshal offices are law enforcement but are not general-purpose. Counting
  // them would overstate general-purpose coverage by about 70%.
  assert.ok(
    !GENERAL_PURPOSE_CATEGORIES.includes(BJS_CATEGORY.CONSTABLE_MARSHAL),
  );
  assert.ok(ALL_AGENCY_CATEGORIES.includes(BJS_CATEGORY.CONSTABLE_MARSHAL));
});

test("neither numerator counts federal, out-of-state or outside-the-census agencies", () => {
  for (const category of [
    BJS_CATEGORY.FEDERAL,
    BJS_CATEGORY.OUT_OF_STATE,
    BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    BJS_CATEGORY.UNCLASSIFIED,
  ]) {
    assert.ok(!GENERAL_PURPOSE_CATEGORIES.includes(category), category);
    assert.ok(!ALL_AGENCY_CATEGORIES.includes(category), category);
  }
});

test("an unmapped source type throws instead of being bucketed", () => {
  assert.throws(
    () => classifyTcoleDepartmentType("Drone Operations Division"),
    UnknownSourceTypeError,
  );
});

test("every department type in the committed roster is mapped", () => {
  const unmapped = [
    ...new Set(roster.departments.map((department) => department.t)),
  ].filter((type) => TCOLE_DEPARTMENT_TYPE_MAP[type] === undefined);
  assert.deepEqual(unmapped, []);
});

test("the mapping carries a rationale for every entry", () => {
  for (const [type, entry] of Object.entries(TCOLE_DEPARTMENT_TYPE_MAP)) {
    assert.ok(entry.why && entry.why.length > 20, `${type} needs a rationale`);
  }
});

test("'State of Texas' resolves per agency: DPS is primary state, the rest are not", () => {
  const dps = classifyTcoleDepartmentType("State of Texas", {
    state: "TX",
    agencyName: PRIMARY_STATE_AGENCY.TX.name,
  });
  assert.equal(dps.category, BJS_CATEGORY.PRIMARY_STATE);
  assert.ok(dps.resolvedPerAgency);

  const tabc = classifyTcoleDepartmentType("State of Texas", {
    state: "TX",
    agencyName: "Texas Alcoholic Beverage Commission",
  });
  assert.equal(tabc.category, BJS_CATEGORY.SPECIAL_JURISDICTION);
});

test("a category without provenance is refused", () => {
  assert.throws(
    () =>
      assertClassificationPublishable({
        agencyName: "Somewhere PD",
        category: BJS_CATEGORY.LOCAL_POLICE,
        sourceType: "Municipal (CCP 2.12 (3))",
        provenance: null,
      }),
    AgencyTypeProvenanceError,
  );
});

test("provenance missing any required field is refused", () => {
  for (const field of [
    "sourceDataset",
    "retrievedOn",
    "confidence",
    "sourceField",
  ]) {
    const incomplete = { ...provenance };
    delete incomplete[field];
    assert.throws(
      () =>
        assertClassificationPublishable({
          agencyName: "Somewhere PD",
          category: BJS_CATEGORY.LOCAL_POLICE,
          sourceType: "Municipal (CCP 2.12 (3))",
          provenance: incomplete,
        }),
      AgencyTypeProvenanceError,
      `missing ${field} should be refused`,
    );
  }
});

test("a classification that does not record the verbatim source value is refused", () => {
  assert.throws(
    () =>
      assertClassificationPublishable({
        agencyName: "Somewhere PD",
        category: BJS_CATEGORY.LOCAL_POLICE,
        sourceType: null,
        provenance,
      }),
    AgencyTypeProvenanceError,
  );
});

test("an unclassified agency must say why", () => {
  assert.throws(
    () =>
      assertClassificationPublishable({
        agencyName: "Somewhere PD",
        category: BJS_CATEGORY.UNCLASSIFIED,
        unclassifiedReason: null,
      }),
    AgencyTypeProvenanceError,
  );
  assert.ok(
    assertClassificationPublishable({
      agencyName: "Somewhere PD",
      category: BJS_CATEGORY.UNCLASSIFIED,
      unclassifiedReason: UNCLASSIFIED_REASON.NO_TYPED_SOURCE_FOR_STATE,
    }),
  );
});

test("one untyped agency makes the whole state's numerator incomplete", () => {
  const [summary] = summarizeClassifications([
    {
      agencyId: "1",
      agencyName: "Austin Police Department",
      state: "TX",
      category: BJS_CATEGORY.LOCAL_POLICE,
      sourceType: "Municipal (CCP 2.12 (3))",
      provenance,
    },
    {
      agencyId: "2",
      agencyName: "Mystery Agency",
      state: "TX",
      category: BJS_CATEGORY.UNCLASSIFIED,
      unclassifiedReason: UNCLASSIFIED_REASON.NOT_IN_SOURCE_ROSTER,
    },
  ]);
  assert.equal(summary.generalPurposeHeld, 1);
  assert.equal(summary.unclassifiedHeld, 1);
  assert.equal(summary.numeratorComplete, false);
});

test("the name join is constrained to the state", () => {
  // Both states really do have a Dallas Police Department. Before the state
  // constraint this join gave the Oregon one a Texas classification.
  const [tx, or] = classifyHeldAgencies(
    [
      { id: "tx", name: "Dallas Police Department", state: "TX" },
      { id: "or", name: "Dallas Police Department", state: "OR" },
    ],
    roster,
  );
  assert.equal(tx.category, BJS_CATEGORY.LOCAL_POLICE);
  assert.equal(or.category, BJS_CATEGORY.UNCLASSIFIED);
  assert.equal(
    or.unclassifiedReason,
    UNCLASSIFIED_REASON.NO_TYPED_SOURCE_FOR_STATE,
  );
});

test("a classified agency carries the verbatim source type and full provenance", () => {
  const [classified] = classifyHeldAgencies(
    [{ id: "1", name: "Anderson Co. Sheriff's Office", state: "TX" }],
    roster,
  );
  assert.equal(classified.category, BJS_CATEGORY.SHERIFF);
  assert.equal(classified.sourceType, "Sheriff (CCP 2.12 (1))");
  assert.equal(classified.provenance.retrievedOn, "2025-02-10");
  assert.match(classified.provenance.joinedOn, /name/);
  assert.ok(assertClassificationPublishable(classified));
});

test("a Texas agency absent from the roster is unclassified, not guessed", () => {
  const [classified] = classifyHeldAgencies(
    [{ id: "1", name: "Nonexistent City Police Department", state: "TX" }],
    roster,
  );
  assert.equal(classified.category, BJS_CATEGORY.UNCLASSIFIED);
  assert.equal(
    classified.unclassifiedReason,
    UNCLASSIFIED_REASON.NOT_IN_SOURCE_ROSTER,
  );
  // A name-pattern classifier would happily call this one local police.
  assert.equal(classified.provenance, null);
});

test("name normalisation ignores punctuation and case but not different words", () => {
  assert.equal(
    normalizeAgencyName("Anderson Co. Sheriff's Office"),
    normalizeAgencyName("ANDERSON CO SHERIFFS OFFICE"),
  );
  // A possessive survives being typed without its apostrophe.
  assert.equal(
    normalizeAgencyName("Anderson Co. Sheriff's Office"),
    normalizeAgencyName("Anderson Co Sheriffs Office"),
  );
  // But abbreviations are not expanded. "Co" and "County" stay distinct: the
  // join is exact by design, and treating them as equal is fuzzy matching.
  assert.notEqual(
    normalizeAgencyName("Anderson Co Sheriffs Office"),
    normalizeAgencyName("Anderson County Sheriffs Office"),
  );
});

test("Texas sheriffs match the state's county count", () => {
  // 254 counties, 254 sheriffs. An independent check that the join is not
  // quietly dropping or duplicating rows.
  const sheriffs = roster.departments.filter(
    (department) =>
      department.s === "TX" &&
      department.t === "Sheriff (CCP 2.12 (1))" &&
      department.a === "ACTIVE",
  );
  assert.equal(sheriffs.length, 254);
});

test("the committed roster carries its own citation and no contact columns", () => {
  assert.equal(
    roster.recordsRequestId,
    "PublicInformationRequest_2025-02-10_1410.xlsx",
  );
  assert.equal(roster.retrievedOn, "2025-02-10");
  assert.equal(roster.sourceField, "DEPARTMENT_TYPE");
  assert.equal(roster.departments.length, roster.rowCount);
  // The source workbook has HEAD_NAME, E_MAIL, PHONE, FAX and an address. This
  // file is committed to a public repository and must carry none of them.
  const keys = new Set(roster.departments.flatMap((d) => Object.keys(d)));
  assert.deepEqual([...keys].sort(), ["a", "n", "s", "t"]);
});
