import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPersonName,
  formatPersonName,
  isPublishablePerson,
} from "./person-name.js";

const reasons = (result) => result.findings.map((f) => f.rule).sort();

test("publishes an ordinary record unchanged", () => {
  const result = classifyPersonName({
    first_name: "Marisol",
    middle_name: "A",
    last_name: "Quillfeather",
  });
  assert.equal(result.publishable, true);
  assert.equal(result.displayName, "Marisol A Quillfeather");
  assert.deepEqual(result.findings, []);
});

test("renders a generational suffix", () => {
  assert.equal(
    formatPersonName({
      first_name: "Tobias",
      last_name: "Brandiwell",
      suffix: "Jr",
    }),
    "Tobias Brandiwell Jr",
  );
  assert.equal(
    formatPersonName({
      first_name: "Everett",
      last_name: "Sample",
      suffix: "III",
    }),
    "Everett Sample III",
  );
});

// The defect this module exists for: a source placeholder in the suffix column
// was being published as part of a real person's name.
test("drops an N/A suffix without unpublishing the person", () => {
  const result = classifyPersonName({
    first_name: "Marisol",
    middle_name: "A",
    last_name: "Quillfeather",
    suffix: "N/A",
  });
  assert.equal(result.publishable, true);
  assert.equal(result.displayName, "Marisol A Quillfeather");
  assert.deepEqual(reasons(result), ["unrecognized-suffix"]);
});

test("drops a badge number parked in the suffix column", () => {
  for (const suffix of ["155", "1", "5"]) {
    const result = classifyPersonName({
      first_name: "Dorian",
      last_name: "Vanterpool",
      suffix,
    });
    assert.equal(
      result.publishable,
      true,
      `suffix ${suffix} should still publish`,
    );
    assert.equal(result.displayName, "Dorian Vanterpool");
  }
});

// "111" is very likely a mis-keyed "III", but inferring that would substitute
// our guess for the public record, so it is dropped and reported instead.
test("does not guess that 111 means III", () => {
  const result = classifyPersonName({
    first_name: "Idris",
    last_name: "Pelland",
    suffix: "111",
  });
  assert.equal(result.displayName, "Idris Pelland");
  assert.deepEqual(reasons(result), ["unrecognized-suffix"]);
});

test("withholds a record with no surname", () => {
  const result = classifyPersonName({
    first_name: "Rosalind",
    middle_name: "G",
  });
  assert.equal(result.publishable, false);
  assert.equal(result.displayName, "");
  assert.deepEqual(reasons(result), ["missing-identity-field"]);
});

test("withholds a record whose given name is a number", () => {
  const result = classifyPersonName({
    first_name: "9",
    middle_name: "R.",
    last_name: "Hollyfield",
  });
  assert.equal(result.publishable, false);
  assert.deepEqual(reasons(result), ["numeric-identity-field"]);
});

test("withholds a fixture given name", () => {
  for (const first of ["Test", "User", "Demo", "qwerty"]) {
    assert.equal(
      isPublishablePerson({ first_name: first, last_name: "Zephyr" }),
      false,
      `${first} should be withheld`,
    );
  }
});

test("withholds everyone attached to a fixture agency", () => {
  const result = classifyPersonName(
    { first_name: "Abner", last_name: "Test" },
    { agencySlugs: ["central-texas-police-dept-04ebcf"] },
  );
  assert.equal(result.publishable, false);
  assert.deepEqual(reasons(result), ["fixture-agency"]);
});

// Everything below is a real officer in the live corpus. A token-based sweep
// across all name fields would unpublish every one of them, which is the
// failure mode this module is shaped to avoid.
test("publishes real surnames that collide with language literals", () => {
  for (const last of [
    "Null",
    "None",
    "True",
    "False",
    "Sample",
    "Tester",
    "Officer",
    "Guest",
  ]) {
    const result = classifyPersonName({
      first_name: "Lysander",
      last_name: last,
    });
    assert.equal(result.publishable, true, `${last} is a real surname`);
    assert.equal(result.displayName, `Lysander ${last}`);
  }
});

test("publishes a real surname that is also a placeholder, but flags it", () => {
  const result = classifyPersonName({
    first_name: "Lysander",
    last_name: "Null",
  });
  assert.equal(result.publishable, true);
  assert.deepEqual(reasons(result), ["ambiguous-name-literal"]);
  assert.equal(result.findings[0].action, "review");
});

test("publishes Test and Tester as surnames at a real agency", () => {
  assert.equal(
    formatPersonName({
      first_name: "Thaddeus",
      middle_name: "R",
      last_name: "Tester",
    }),
    "Thaddeus R Tester",
  );
});

test("drops a stray punctuation component without unpublishing the officer", () => {
  const result = classifyPersonName({
    first_name: "Caspian",
    middle_name: "-",
    last_name: "Ferrowyn Calder",
  });
  assert.equal(result.publishable, true);
  assert.equal(result.displayName, "Caspian Ferrowyn Calder");
  assert.deepEqual(reasons(result), ["non-name-component"]);
});

test("a withheld record renders no name at all", () => {
  // A caller that forgets to check `publishable` must get nothing, not a
  // partial or placeholder name.
  assert.equal(
    formatPersonName({ first_name: "Test", last_name: "Zephyr" }),
    "",
  );
});

test("ignores non-string field values rather than coercing them", () => {
  // The seed loader once coerced the surname "True" to boolean 1. Anything
  // that is not a string is treated as absent, never stringified into a name.
  const result = classifyPersonName({ first_name: "Lysander", last_name: 1 });
  assert.equal(result.publishable, false);
  assert.deepEqual(reasons(result), ["missing-identity-field"]);
});
