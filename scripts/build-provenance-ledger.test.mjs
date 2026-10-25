import assert from "node:assert/strict";
import test from "node:test";

import { parseIdentityMap } from "./build-provenance-ledger.mjs";

test("mappings are read from the identity map, header and all", () => {
  const { ids, annotated } = parseIdentityMap(
    [
      "version: 1",
      "source: tcole",
      "id_field: PUBLIC_GUID",
      "mappings:",
      "  '1000033': cm7a0bgot04alewvgibyq384j",
      "  '1000038': cm7a0bgot04amewvgui2dh3z6",
      "",
    ].join("\n"),
  );
  assert.deepEqual(ids, [
    "cm7a0bgot04alewvgibyq384j",
    "cm7a0bgot04amewvgui2dh3z6",
  ]);
  assert.deepEqual(annotated, []);
});

// The agency-officers key is a source tuple containing both `|` and `:`-free
// dates; splitting on the first colon would take the key apart.
test("a mapping key containing separators still yields its canonical id", () => {
  const { ids } = parseIdentityMap(
    [
      "mappings:",
      "  1000038|201217|Peace Officer|Peace Officer License|1994-06-16|2023-09-30: cm7a0bh4u2wkzewvg1sffq8hx",
      "",
    ].join("\n"),
  );
  assert.deepEqual(ids, ["cm7a0bh4u2wkzewvg1sffq8hx"]);
});

// The five True-name corrections were appended under a comment after the load.
// "Confirmed" by an unrecorded method is different evidence from a generated
// mapping, so the count is carried rather than blended in.
test("mappings appended under an in-block comment are counted separately", () => {
  const { ids, annotated } = parseIdentityMap(
    [
      "mappings:",
      "  '1000033': cm7a0bgot04alewvgibyq384j",
      "",
      "  # Confirmed True-name identity corrections, 2026-09-21.",
      "  '1210883': cm7a0bgrc0kmnewvgm8v6nvh7",
      "",
    ].join("\n"),
  );
  assert.equal(ids.length, 2);
  assert.deepEqual(annotated, ["cm7a0bgrc0kmnewvgm8v6nvh7"]);
});

test("a mapping line with no canonical id fails loudly", () => {
  assert.throws(
    () => parseIdentityMap(["mappings:", "  '1000033':", ""].join("\n")),
    /does not end in a canonical id/,
  );
});

test("content before the mappings block is not read as a mapping", () => {
  const { ids } = parseIdentityMap(
    ["version: 1", "notes: TCOLE PUBLIC_GUID values mapped to ids", ""].join(
      "\n",
    ),
  );
  assert.deepEqual(ids, []);
});
