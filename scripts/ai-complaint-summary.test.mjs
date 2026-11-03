import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requireAiComplaintSummary,
  requireComplaintSummaryUnavailability,
} from "../src/lib/data/ai-complaint-summary.ts";
const summary = {
  summary: "The plaintiff alleges an unlawful detention.",
  source: {
    url: "https://example.org/complaint.pdf",
    sourcePage: "https://example.org/docket/3/",
    documentId: 123,
    documentNumber: "3",
    filingDate: "2025-01-02",
    retrievedAt: "2026-01-02T12:00:00Z",
    sha1: "a".repeat(40),
    sha256: "b".repeat(64),
    sha1Verified: true,
    confidence: "Fidelity to complaint only; allegations unproven",
  },
  model: "test-model",
  generatedAt: "2026-01-02",
  support: [{ paragraph: 1, pages: "1–2" }],
  publicationStatus: "internal draft; not published",
  limitations: "Allegations, not findings.",
  proceduralContext: [
    {
      text: "The docket records a motion.",
      url: "https://example.org/docket/4/",
      sourceDate: "2025-02-01",
      retrievedAt: "2026-01-02T12:00:00Z",
      confidence: "Retrieved docket metadata only",
    },
  ],
};
test("requires complete provenance before rendering", () => {
  assert.deepEqual(requireAiComplaintSummary(summary), summary);
  assert.equal(requireAiComplaintSummary(null), null);
  assert.throws(() => requireAiComplaintSummary(undefined));
  for (const key of Object.keys(summary.source)) {
    const invalid = structuredClone(summary);
    delete invalid.source[key];
    assert.throws(() => requireAiComplaintSummary(invalid), key);
  }
  for (const key of Object.keys(summary)) {
    const invalid = structuredClone(summary);
    delete invalid[key];
    assert.throws(() => requireAiComplaintSummary(invalid), key);
  }
});
test("rejects unsafe citations and invalid dates", () => {
  for (const [key, value] of [
    ["url", "javascript:alert(1)"],
    ["filingDate", "2025-02-30"],
    ["sha1Verified", false],
    ["confidence", " "],
  ]) {
    assert.throws(() =>
      requireAiComplaintSummary({
        ...summary,
        source: { ...summary.source, [key]: value },
      }),
    );
  }
});

test("unavailability requires evidence and cannot contradict a completed summary", () => {
  const state = {
    reason: "missing_copy",
    sourceUrl: "https://example.org/docket/",
    checkedAt: "2026-01-02T12:00:00Z",
    detail: "Copy absent from retained records.",
  };
  assert.deepEqual(requireComplaintSummaryUnavailability(state, null), state);
  assert.equal(requireComplaintSummaryUnavailability(null, null), null);
  assert.throws(() => requireComplaintSummaryUnavailability(state, summary));
  for (const key of Object.keys(state)) {
    const incomplete = { ...state };
    delete incomplete[key];
    assert.throws(() =>
      requireComplaintSummaryUnavailability(incomplete, null),
    );
  }
  assert.throws(() =>
    requireComplaintSummaryUnavailability(
      { ...state, sourceUrl: "javascript:alert(1)" },
      null,
    ),
  );
});
