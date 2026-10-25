import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  classifyCauseNumber,
  publishableCauseNumber,
  redactCauseNumbers,
  suppressCauseNumbers,
} from "../src/lib/data/cause-number.js";
import {
  findEnforcementGaps,
  findManufacturedDockets,
} from "./validate-cause-numbers.mjs";

/**
 * The INS-18 §11 census of Cohort B, verbatim: every distinct value found in a
 * published `cause_number` slot across 102 person-to-lawsuit associations.
 *
 * Pinned rather than sampled. The rule is an allowlist, so the risk it carries
 * is withholding a real docket whose shape the predicate does not recognize —
 * these 29 are the evidence that it does recognize the shapes in the corpus.
 */
const MEASURED_FEDERAL_DOCKETS = [
  "0:20-cv-01577",
  "0:23-cv-00273",
  "1:07-cv-02994",
  "1:14-cv-02670",
  "1:20-cv-02389",
  "1:21-cv-03752",
  "1:22-cv-01160",
  "1:25-cv-01172",
  "2:19-cv-00171",
  "2:20-cv-11174",
  "2:22-cv-00404",
  "2:23-cv-02224",
  "2:25-cv-00276",
  "3:09-cv-04835",
  "3:18-cv-02862",
  "3:19-cv-00391",
  "3:21-cv-05692",
  "3:22-cv-01209",
  "3:23-cv-01895",
  "4:15-cv-02232",
  "4:21-cv-00808",
  "4:23-cv-00044",
  "4:26-cv-01418",
  "4:26-cv-02517",
  "6:20-cv-06675",
  "7:25-cv-00138",
  "8:25-cv-02790",
];

const MEASURED_STATE_DOCKETS = ["20-CI-003134", "CVH-20230069"];

/**
 * The 9 distinct manufactured values behind the 17 affected associations, with
 * the court each is published next to. Six name a real federal court, which is
 * why these are the dangerous ones: the court is checkable and the docket is
 * not, so the pair looks like a citation and defeats verification.
 */
const MEASURED_PLACEHOLDERS = [
  ["CASTILE-ST-ANTHONY-2017", "Ramsey County, Minn."],
  ["DIALLO-NYC-2000", "S.D.N.Y."],
  ["GARNER-NYC-2015", "New York City"],
  ["GRAY-BALTIMORE-2015", "Baltimore City"],
  ["HILL-COLUMBUS-2021", "S.D. Ohio"],
  ["MASSEY-SANGAMON-2024", "C.D. Ill."],
  ["MCDONALD-CHICAGO-2015", "N.D. Ill."],
  ["SCOTT-NORTH-CHARLESTON-2015", "D.S.C."],
  ["WRIGHT-BROOKLYN-CENTER-2021", "D. Minn."],
];

test("every measured federal docket stays published", () => {
  for (const docket of MEASURED_FEDERAL_DOCKETS) {
    assert.equal(
      classifyCauseNumber(docket),
      "federal_docket",
      `${docket} is a real S.D./N.D./C.D. docket and must not be withheld`,
    );
    assert.equal(publishableCauseNumber(docket), docket);
  }
});

test("every measured state docket stays published", () => {
  for (const docket of MEASURED_STATE_DOCKETS) {
    assert.equal(classifyCauseNumber(docket), "state_docket", docket);
    assert.equal(publishableCauseNumber(docket), docket);
  }
});

/**
 * Every Fifth Circuit appellate docket in the published corpus, from a live
 * sweep of all 570 `/civil-cases/` records on 2026-10-25.
 *
 * Pinned because these are the near-miss case: the generic state-docket rule
 * published them for the right reason but labelled them wrong, and the label is
 * what the build gate reports. They also stand as evidence against the risk the
 * allowlist direction carries — it is not withholding real identifiers in the
 * corpus that actually shipped.
 */
const LIVE_APPELLATE_DOCKETS = [
  "22-40559",
  "23-10246",
  "23-10395",
  "23-20054",
  "23-20281",
  "23-20539",
  "23-40653",
  "23-50885",
  "24-10663",
  "24-20521",
  "24-50783",
  "24-50826",
  "25-10259",
  "25-10979",
  "25-20309",
  "25-40106",
  "25-40302",
  "25-40481",
  "25-50246",
  "25-50293",
  "25-50717",
  "25-50719",
  "25-50786",
];

test("every live appellate docket stays published, labelled federal", () => {
  for (const docket of LIVE_APPELLATE_DOCKETS) {
    assert.equal(
      classifyCauseNumber(docket),
      "federal_appellate_docket",
      `${docket} is a Fifth Circuit docket, not a state docket`,
    );
    assert.equal(publishableCauseNumber(docket), docket);
  }
});

test("nothing in the live published corpus is withheld", () => {
  // The 2026-10-25 sweep found 570 published cause numbers: 547 federal
  // district, 23 Fifth Circuit, 0 manufactured. If a future change starts
  // withholding these shapes, the gate would strip real citations off every
  // case page, so the corpus that shipped is pinned as a floor.
  const live = [...MEASURED_FEDERAL_DOCKETS, ...LIVE_APPELLATE_DOCKETS];
  assert.deepEqual(
    live.filter((value) => publishableCauseNumber(value) === null),
    [],
  );
});

test("every measured manufactured docket is withheld", () => {
  for (const [placeholder, court] of MEASURED_PLACEHOLDERS) {
    assert.equal(
      classifyCauseNumber(placeholder),
      "synthetic_placeholder",
      `${placeholder} identifies no record in ${court}`,
    );
    assert.equal(publishableCauseNumber(placeholder), null);
  }
});

test("the census adds up to what INS-18 §11 measured", () => {
  const kinds = [
    ...MEASURED_FEDERAL_DOCKETS,
    ...MEASURED_STATE_DOCKETS,
    ...MEASURED_PLACEHOLDERS.map(([value]) => value),
  ].map(classifyCauseNumber);
  assert.equal(kinds.filter((kind) => kind === "federal_docket").length, 27);
  assert.equal(kinds.filter((kind) => kind === "state_docket").length, 2);
  assert.equal(
    kinds.filter((kind) => kind === "synthetic_placeholder").length,
    9,
  );
});

test("a value is withheld when it carries no filing sequence", () => {
  // The structural rule, independent of the upper-case placeholder shape: a
  // court has to tell apart the cases filed in the same year, so a real docket
  // carries a sequence and not just a year.
  for (const value of [
    "Gray-Baltimore-2015",
    "gray-baltimore-2015",
    "Pre-litigation settlement",
    "2015",
    "see attached",
    "N/A",
    "--",
  ]) {
    assert.equal(publishableCauseNumber(value), null, value);
  }
});

test("state docket shapes beyond the measured two stay published", () => {
  for (const value of [
    "CR-2015-1234",
    "2015CF000123",
    "2015-123",
    "24CV0042",
  ]) {
    assert.equal(publishableCauseNumber(value), value, value);
  }
});

test("an absent cause number is absent, not suppressed", () => {
  for (const value of [null, undefined, "", "   ", 42]) {
    assert.equal(classifyCauseNumber(value), "absent");
    assert.equal(publishableCauseNumber(value), null);
  }
});

test("redaction keys on the column, so select * is covered", () => {
  const rows = [
    { id: "a", cause_number: "GRAY-BALTIMORE-2015", court: "Baltimore City" },
    { id: "b", cause_number: "4:21-cv-00808", court: "N.D. Tex." },
    { id: "c", title: "no cause number column at all" },
  ];
  redactCauseNumbers(rows);
  assert.equal(rows[0].cause_number, null);
  assert.equal(rows[0].court, "Baltimore City");
  assert.equal(rows[1].cause_number, "4:21-cv-00808");
  assert.ok(!Object.hasOwn(rows[2], "cause_number"));
});

test("a manufactured docket cannot reach a page projection through withDb", async () => {
  // The regression INS-42 exists to prevent. The fake client stands in for the
  // real `select * from public.civil_cases` on the personnel page, which is the
  // read that feeds the UGC prefill payloads.
  const fake = {
    calls: 0,
    async query(text, values) {
      this.calls += 1;
      return {
        command: "SELECT",
        rowCount: MEASURED_PLACEHOLDERS.length,
        text,
        values,
        rows: MEASURED_PLACEHOLDERS.map(([cause_number, court], index) => ({
          id: `case-${index}`,
          cause_number,
          court,
          title: "Case caption",
        })),
      };
    },
    release() {
      return "released";
    },
  };

  const client = suppressCauseNumbers(fake);
  const result = await client.query("select * from public.civil_cases", [1]);

  assert.deepEqual(
    result.rows.map((row) => row.cause_number),
    MEASURED_PLACEHOLDERS.map(() => null),
  );
  // Everything the page legitimately publishes survives, and the rest of the
  // client API is untouched.
  assert.deepEqual(
    result.rows.map((row) => row.court),
    MEASURED_PLACEHOLDERS.map(([, court]) => court),
  );
  assert.equal(result.rowCount, MEASURED_PLACEHOLDERS.length);
  assert.deepEqual(result.values, [1]);
  assert.equal(fake.calls, 1);
  assert.equal(client.release(), "released");
});

test("the build gate reads page source, not the visible DOM", () => {
  // The Cohort B surface: the association ships only inside this payload, where
  // no template conditional runs and nothing is labelled "Cause number".
  const payload = `<script type="application/json">{"civilLitigationSummary":"Gray v. City of Baltimore (Freddie Gray) — GRAY-BALTIMORE-2015 — Baltimore City — /civil-litigation/md/gray-v-city-of-baltimore-pre-litigation-baltimore-md-2015/"}</script>`;
  assert.deepEqual(findManufacturedDockets(payload), [
    { value: "GRAY-BALTIMORE-2015", kind: "synthetic_placeholder" },
  ]);
});

test("the build gate leaves real dockets alone", () => {
  const page = `<dt>Cause number</dt><dd>4:21-cv-00808</dd><dd>20-CI-003134</dd>
    <script type="application/ld+json">{"identifier":"CVH-20230069"}</script>
    <p>FORT WORTH POLICE DEPARTMENT</p>`;
  assert.deepEqual(findManufacturedDockets(page), []);
});

test("the build gate reports each manufactured value once per file", () => {
  const page = MEASURED_PLACEHOLDERS.map(
    ([value]) => `<td>${value}</td><td>${value}</td>`,
  ).join("");
  assert.deepEqual(
    findManufacturedDockets(page).map(({ value }) => value),
    MEASURED_PLACEHOLDERS.map(([value]) => value),
  );
});

test("db.js wires the enforcement point", async () => {
  const dbSource = await fs.readFile(path.resolve("src/lib/db.js"), "utf8");
  assert.deepEqual(findEnforcementGaps(dbSource), []);
});

test("removing the enforcement point fails the source gate", () => {
  // Mutation test. The gate asserts wiring, so the thing worth proving is that
  // it actually fails when the wiring goes away.
  const withoutCall = `import { suppressCauseNumbers } from "./data/cause-number.js";
    export const withDb = async (fn) => fn(client);`;
  assert.equal(findEnforcementGaps(withoutCall).length, 1);

  const withoutImport = `export const withDb = async (fn) => fn(client);`;
  assert.equal(findEnforcementGaps(withoutImport).length, 2);
});
