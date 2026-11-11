export type AiComplaintSummary = {
  summary: string;
  source: {
    url: string;
    sourcePage: string;
    documentId: number;
    documentNumber: string;
    filingDate: string;
    retrievedAt: string;
    sha1: string;
    sha256: string;
    sha1Verified: true;
    confidence: string;
  };
  model: string;
  generatedAt: string;
  support: { paragraph: number; pages: string }[];
  publicationStatus: "internal draft; not published";
  limitations: string;
  proceduralContext: {
    text: string;
    url: string;
    sourceDate: string;
    retrievedAt: string;
    confidence: string;
  }[];
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("AI complaint summary requires complete provenance.");
  return value as Record<string, unknown>;
}
function text(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("AI complaint summary requires nonblank provenance.");
}
function url(value: unknown) {
  text(value);
  if (!["http:", "https:"].includes(new URL(value).protocol))
    throw new Error("AI complaint summary requires an HTTP source URL.");
}
function date(value: unknown) {
  text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error("AI complaint summary requires a valid source date.");
}
function timestamp(value: unknown) {
  text(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(
      "AI complaint summary requires a retrieval timestamp with timezone.",
    );
  date(value.slice(0, 10));
}
function entries(value: unknown) {
  if (!Array.isArray(value) || !value.length)
    throw new Error(
      "AI complaint summary requires source support and procedural context.",
    );
  return value.map(object);
}
export function requireAiComplaintSummary(
  value: unknown,
): AiComplaintSummary | null {
  if (value === null) return null;
  const summary = object(value);
  for (const key of ["summary", "model", "limitations"]) text(summary[key]);
  date(summary.generatedAt);
  if (summary.publicationStatus !== "internal draft; not published")
    throw new Error("Unsupported AI complaint summary publication status.");
  const source = object(summary.source);
  url(source.url);
  url(source.sourcePage);
  date(source.filingDate);
  timestamp(source.retrievedAt);
  text(source.documentNumber);
  text(source.confidence);
  if (
    !Number.isInteger(source.documentId) ||
    Number(source.documentId) <= 0 ||
    source.sha1Verified !== true
  )
    throw new Error(
      "AI complaint summary requires a verified source document.",
    );
  text(source.sha1);
  text(source.sha256);
  if (
    !/^[a-f0-9]{40}$/.test(source.sha1) ||
    !/^[a-f0-9]{64}$/.test(source.sha256)
  )
    throw new Error("AI complaint summary requires source hashes.");
  for (const support of entries(summary.support)) {
    if (!Number.isInteger(support.paragraph) || Number(support.paragraph) <= 0)
      throw new Error("Invalid complaint paragraph reference.");
    text(support.pages);
  }
  for (const context of entries(summary.proceduralContext)) {
    text(context.text);
    url(context.url);
    date(context.sourceDate);
    timestamp(context.retrievedAt);
    text(context.confidence);
  }
  return value as AiComplaintSummary;
}

export type ComplaintSummaryUnavailability = {
  reason:
    | "missing_copy"
    | "pending"
    | "retrieval_failed"
    | "authentication_failed"
    | "generation_failed"
    | "available_unsummarized";
  sourceUrl: string;
  checkedAt: string;
  detail: string;
};

export function requireComplaintSummaryUnavailability(
  value: unknown,
  summary: AiComplaintSummary | null,
): ComplaintSummaryUnavailability | null {
  if (value === null) return null;
  if (summary)
    throw new Error("A completed summary cannot also be unavailable.");
  const state = object(value);
  if (
    ![
      "missing_copy",
      "pending",
      "retrieval_failed",
      "authentication_failed",
      "generation_failed",
      "available_unsummarized",
    ].includes(String(state.reason))
  )
    throw new Error("Invalid complaint summary state.");
  url(state.sourceUrl);
  timestamp(state.checkedAt);
  text(state.detail);
  return value as ComplaintSummaryUnavailability;
}
