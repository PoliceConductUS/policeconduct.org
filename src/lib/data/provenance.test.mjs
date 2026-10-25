import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  citeRow,
  isSuppressed,
  projection,
  projectionWithProvenance,
  assertNoSuppressedColumns,
  projectedText,
  rowSourceKind,
} from "./personnel-projection.js";
import {
  attestationFor,
  resetLedgerCache,
  resolveRowProvenance,
} from "./provenance-ledger.js";
import {
  SUPPRESSION_CONTRACT,
  capClass,
  evaluateField,
  isAccuracyRule,
} from "./field-suppression.js";
import {
  classDisclosure,
  classify,
  identityDisclosure,
  isRenderableClass,
  isSubmittedSource,
} from "./provenance.js";

const TCOLE = "tx-tcole-2025-02-17-all-officers";

/** Write a ledger file and point the resolver at it. */
const useLedger = (lines) => {
  const dir = mkdtempSync(path.join(tmpdir(), "provenance-ledger-"));
  const file = path.join(dir, "ledger.tsv");
  writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  process.env.PROVENANCE_LEDGER = file;
  resetLedgerCache();
  return file;
};

const useNoLedger = () => {
  process.env.PROVENANCE_LEDGER = path.join(
    mkdtempSync(path.join(tmpdir(), "provenance-empty-")),
    "missing.tsv",
  );
  resetLedgerCache();
};

const report = () => {
  process.env.PROVENANCE_ENFORCEMENT = "report";
};

const enforce = () => {
  process.env.PROVENANCE_ENFORCEMENT = "enforce";
};

test.afterEach(() => {
  delete process.env.PROVENANCE_ENFORCEMENT;
  delete process.env.PROVENANCE_LEDGER;
  resetLedgerCache();
});

// The load-bearing assertion. A ledger entry without a retrieval date must not
// be classified traceable: that is what stops "we know the dataset" being
// quietly upgraded to "we have a citation."
test("a dataset with no attested retrieval date never classifies as traceable", () => {
  const attestation = attestationFor(TCOLE);
  assert.ok(attestation, "the TCOLE production must be registered");
  assert.equal(attestation.retrievedAt, null);
  assert.equal(classify(attestation), "source_and_dataset_verified");
  assert.equal(
    classify({ ...attestation, retrievedAt: "2025-02-10" }),
    "traceable",
  );
});

test("the contract caps every class at source_and_dataset_verified", () => {
  assert.equal(capClass("traceable"), "source_and_dataset_verified");
  assert.equal(
    capClass("source_and_dataset_verified"),
    "source_and_dataset_verified",
  );
  assert.equal(capClass("not_traceable"), "not_traceable");
});

test("a citation at the current class tells the reader the retrieval date is missing", () => {
  const attestation = attestationFor(TCOLE);
  const citation = {
    provenanceClass: classify(attestation),
    retrievalDateAttested: Boolean(attestation.retrievedAt),
    identityConfidence: "unique_name",
  };
  assert.equal(citation.retrievalDateAttested, false);
  assert.match(classDisclosure(citation), /do not have a dated receipt/);
  assert.equal(identityDisclosure(citation), null);
});

test("a name collision resolved by row order is disclosed, not hidden", () => {
  assert.match(
    identityDisclosure({ identityConfidence: "name_plus_services" }),
    /shares this name/,
  );
  assert.match(
    identityDisclosure({ identityConfidence: "duplicate_order" }),
    /cannot tell which one/,
  );
});

test("only source_and_dataset_verified and above may render", () => {
  assert.equal(isRenderableClass("traceable"), true);
  assert.equal(isRenderableClass("source_and_dataset_verified"), true);
  assert.equal(isRenderableClass("source_identity_only"), false);
  assert.equal(isRenderableClass("not_traceable"), false);
});

test("badge number is suppressed at the select list, so it is never fetched", () => {
  assert.equal(isSuppressed("agency_personnel", "badge_number"), true);
  const list = projection("agency_personnel", "ao");
  assert.ok(!list.includes("badge_number"), list);
  assert.ok(list.includes("ao.start_date"), list);
  assert.ok(
    !projectionWithProvenance("agency_personnel", "ao").includes(
      "badge_number",
    ),
  );
  assert.ok(
    projectionWithProvenance("agency_personnel", "ao").includes(
      "ao.provenance_dataset_id",
    ),
  );
});

test("a hand-written join that reintroduces a suppressed column fails the build", () => {
  assert.throws(
    () =>
      assertNoSuppressedColumns("agency_personnel", [
        { id: "x", badge_number: "2586" },
      ]),
    /badge_number reached a published page projection/,
  );
});

test("a reader-facing projection for an unknown table is a hard error", () => {
  assert.throws(
    () => projection("civil_cases", "c"),
    /No personnel projection is defined for table civil_cases/,
  );
});

test("a row the ledger does not cover is not traceable", () => {
  useNoLedger();
  const resolved = resolveRowProvenance("personnel", { id: "unmapped" });
  assert.equal(resolved.origin, "none");
  assert.equal(resolved.attestation, null);
  assert.equal(resolved.provenanceClass, "not_traceable");
});

test("in enforce mode an uncited field cannot reach the projection", () => {
  useNoLedger();
  enforce();
  const cited = citeRow("personnel", {
    id: "hand-authored",
    slug: "jonathan-ross-b1c2d3",
    first_name: "Jonathan",
    last_name: "Ross",
  });
  assert.deepEqual(Object.keys(cited.values), []);
  assert.equal(projectedText(cited, "first_name"), null);
  assert.ok(
    cited.withheld.some((entry) => entry.ruleId === "no-established-channel"),
  );
});

test("in report mode the same field renders, marked uncited, and is recorded", () => {
  useNoLedger();
  report();
  const cited = citeRow("personnel", {
    id: "hand-authored",
    slug: "jonathan-ross-b1c2d3",
    first_name: "Jonathan",
  });
  const projected = projectedText(cited, "first_name");
  assert.ok(projected);
  assert.equal(projected.kind, "uncited");
  assert.equal(projected.value, "Jonathan");
});

test("a ledgered row renders with a citation naming the records request", () => {
  useLedger([`personnel\tmapped-1\t${TCOLE}\tunique_name`]);
  enforce();
  const cited = citeRow("personnel", {
    id: "mapped-1",
    slug: "jane-smith-0a1b2c",
    first_name: "Jane",
    last_name: "Smith",
  });
  const projected = projectedText(cited, "last_name");
  assert.ok(projected);
  assert.equal(projected.kind, "cited");
  assert.equal(projected.citation.datasetId, TCOLE);
  assert.equal(projected.citation.sourceKind, "public_records_request");
  assert.equal(projected.citation.retrievalDateAttested, false);
  assert.equal(
    projected.citation.provenanceClass,
    "source_and_dataset_verified",
  );
  assert.equal(rowSourceKind(cited), "public_records_request");
  assert.equal(isSubmittedSource("public_records_request"), false);
  assert.equal(isSubmittedSource("community_submission"), true);
});

// The dataset has no badge column, so no row may cite it for one even if the
// column were somehow fetched.
test("an attestation cannot be cited for a field the dataset does not contain", () => {
  useLedger([`agency_personnel\tap-1\t${TCOLE}\tunique_name`]);
  enforce();
  const cited = citeRow(
    "agency_personnel",
    { id: "ap-1", badge_number: "49112", start_date: "2019-03-04" },
    {
      slug: "spenser-stockwell-h7i8j9",
      columns: ["badge_number", "start_date"],
    },
  );
  assert.equal(projectedText(cited, "badge_number"), null);
  assert.equal(projectedText(cited, "start_date").kind, "cited");
  assert.ok(
    cited.withheld.some(
      (entry) => entry.ruleId === "badge-number-unsourceable",
    ),
  );
});

test("accuracy rules fire in report mode, where provenance rules do not", () => {
  useNoLedger();
  report();
  const cited = citeRow("personnel", {
    id: "placeholder-suffix",
    slug: "belem-burciaga-n-a-92820f",
    first_name: "Belem",
    suffix: "N/a",
  });
  assert.equal(projectedText(cited, "suffix"), null);
  assert.ok(
    cited.withheld.some(
      (entry) => entry.ruleId === "source-placeholder-as-data",
    ),
  );
  assert.equal(projectedText(cited, "first_name").kind, "uncited");
});

test("the epoch sentinel start date is withheld, not published as a date", () => {
  useLedger([`agency_personnel\tap-epoch\t${TCOLE}\tunique_name`]);
  enforce();
  const cited = citeRow(
    "agency_personnel",
    { id: "ap-epoch", start_date: "1970-01-01", title: "Peace Officer" },
    { slug: null },
  );
  assert.equal(projectedText(cited, "start_date"), null);
  assert.equal(projectedText(cited, "title").kind, "cited");
  assert.ok(
    cited.withheld.some(
      (entry) => entry.ruleId === "epoch-sentinel-start-date",
    ),
  );
});

test("a name coerced from a boolean quarantines the whole row", () => {
  useLedger([`personnel\tap-true\t${TCOLE}\tunique_name`]);
  enforce();
  const cited = citeRow("personnel", {
    id: "ap-true",
    slug: "chris-true-6639a9",
    first_name: "CHRIS",
    middle_name: "A",
    last_name: "1",
  });
  assert.equal(cited.rowWithheld, true);
  assert.deepEqual(Object.keys(cited.values), []);
  assert.ok(
    cited.withheld.some((entry) => entry.ruleId === "name-literal-coercion"),
  );
});

test("records with perfect lineage and a wrong value are still withheld", () => {
  useLedger([`personnel\ttest-record\t${TCOLE}\tunique_name`]);
  enforce();
  const cited = citeRow("personnel", {
    id: "test-record",
    slug: "jailer-1-test-68994f",
    first_name: "Jailer 1",
    last_name: "Test",
  });
  assert.equal(projectedText(cited, "first_name"), null);
  assert.equal(projectedText(cited, "last_name"), null);
  assert.ok(
    cited.withheld.some(
      (entry) => entry.ruleId === "traceable-but-not-correct",
    ),
  );
});

test("a badge number inside narrative prose is withheld by a field rule", () => {
  const decision = evaluateField({
    table: "civil_cases",
    column: "claims_summary",
    value:
      "Officers wearing badge 1379 and badge #1263 detained the plaintiff outside.",
    slug: "lotts-v-city-of-irving-2025",
    provenanceClass: "source_and_dataset_verified",
    identityConfidence: "unique_name",
    enforceProvenanceRules: false,
  });
  assert.equal(decision.kind, "withhold");
  assert.equal(decision.ruleId, "badge-number-in-prose");
});

test("a name-collision row discloses its match tier when it renders", () => {
  useLedger([`personnel\tcollision\t${TCOLE}\tname_plus_services`]);
  enforce();
  const cited = citeRow("personnel", {
    id: "collision",
    slug: "john-smith-ab12cd",
    last_name: "Smith",
  });
  const projected = projectedText(cited, "last_name");
  assert.equal(projected.kind, "cited");
  assert.deepEqual([...projected.disclosures], ["identity-collision-risk"]);
  assert.equal(projected.citation.identityConfidence, "name_plus_services");
});

test("a row matched only by arbitrary duplicate ordering publishes nothing", () => {
  useLedger([`personnel\tambiguous\t${TCOLE}\tduplicate_order`]);
  enforce();
  const cited = citeRow("personnel", {
    id: "ambiguous",
    slug: "john-smith-ef34gh",
    last_name: "Smith",
  });
  assert.equal(cited.rowWithheld, true);
  assert.deepEqual(Object.keys(cited.values), []);
});

test("provenance carried on the row takes precedence over the ledger", () => {
  useNoLedger();
  enforce();
  const cited = citeRow("agency_personnel", {
    id: "ap-pipeline",
    start_date: "2021-06-01",
    provenance_dataset_id: TCOLE,
    provenance_retrieved_at: "2025-02-10",
    identity_match_method: "unique_name",
  });
  const projected = projectedText(cited, "start_date");
  assert.equal(projected.kind, "cited");
  assert.equal(cited.provenance.origin, "row");
  // The contract's ceiling still applies: no configuration promotes a row to
  // traceable while the retrieval-date rule stands.
  assert.equal(
    projected.citation.provenanceClass,
    "source_and_dataset_verified",
  );
  assert.equal(projected.citation.retrievedAt, "2025-02-10");
});

test("a row citing an unregistered dataset fails loudly", () => {
  useNoLedger();
  enforce();
  assert.throws(
    () =>
      citeRow("personnel", {
        id: "ap-unknown",
        first_name: "Jane",
        provenance_dataset_id: "mystery-dataset",
      }),
    /has no attestation in provenance-attestations.json/,
  );
});

test("a malformed ledger line fails the build instead of being skipped", () => {
  useLedger([`personnel\tmissing-columns`]);
  assert.throws(
    () => resolveRowProvenance("personnel", { id: "missing-columns" }),
    /is malformed/,
  );
});

test("a ledger line citing an unknown dataset fails the build", () => {
  useLedger([`personnel\trow\tnot-registered\tunique_name`]);
  assert.throws(
    () => resolveRowProvenance("personnel", { id: "row" }),
    /has no attestation/,
  );
});

test("an unknown enforcement mode is rejected rather than guessed", () => {
  useNoLedger();
  process.env.PROVENANCE_ENFORCEMENT = "partially";
  assert.throws(
    () => citeRow("personnel", { id: "x", first_name: "Jane" }),
    /PROVENANCE_ENFORCEMENT must be/,
  );
});

test("every contract rule is classified as accuracy or provenance", () => {
  const ids = SUPPRESSION_CONTRACT.rules.map((rule) => rule.id);
  assert.equal(ids.length, 9, ids.join(", "));
  const provenanceRules = ids.filter((id) => !isAccuracyRule(id));
  assert.deepEqual(provenanceRules.sort(), [
    "identity-collision-risk",
    "no-established-channel",
    "retrieval-date-missing",
  ]);
});

test("every contract rule carries its evidence and who decided it", () => {
  for (const rule of SUPPRESSION_CONTRACT.rules) {
    assert.ok(rule.reason.length > 40, `${rule.id} needs a reason`);
    assert.ok(rule.evidence.length > 0, `${rule.id} needs evidence`);
    assert.ok(rule.decidedBy.length > 0, `${rule.id} needs a decision owner`);
  }
});
