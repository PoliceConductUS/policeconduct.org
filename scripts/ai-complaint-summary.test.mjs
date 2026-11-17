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
test("requires only rendered summary text and complaint link", () => {
  const minimal = {
    summary: summary.summary,
    source: { sourcePage: summary.source.sourcePage },
  };
  assert.deepEqual(requireAiComplaintSummary(minimal), minimal);
  assert.deepEqual(requireAiComplaintSummary(summary), summary);
  assert.equal(requireAiComplaintSummary(null), null);
  assert.throws(() => requireAiComplaintSummary(undefined));
  assert.throws(() => requireAiComplaintSummary({ ...minimal, summary: " " }));
  assert.throws(() => requireAiComplaintSummary({ ...minimal, source: {} }));
  assert.throws(() =>
    requireAiComplaintSummary({
      ...minimal,
      source: { sourcePage: "javascript:alert(1)" },
    }),
  );
});

test("unavailability requires evidence and cannot contradict a completed summary", () => {
  const state = {
    reason: "missing_copy",
    sourceUrl: "https://example.org/docket/",
    checkedAt: "2026-01-02T12:00:00Z",
    detail: "Copy absent from retained records.",
  };
  assert.deepEqual(requireComplaintSummaryUnavailability(state, null), state);
  assert.deepEqual(
    requireComplaintSummaryUnavailability(
      { ...state, reason: "available_unsummarized" },
      null,
    ),
    { ...state, reason: "available_unsummarized" },
  );
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
