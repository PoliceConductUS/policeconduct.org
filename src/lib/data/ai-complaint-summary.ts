export type AiComplaintSummary = {
  summary: string;
  source: { sourcePage: string };
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a complaint summary or unavailability object.");
  return value as Record<string, unknown>;
}
function text(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Expected nonblank complaint summary text.");
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
export function requireAiComplaintSummary(
  value: unknown,
): AiComplaintSummary | null {
  if (value === null) return null;
  const summary = object(value);
  text(summary.summary);
  const source = object(summary.source);
  url(source.sourcePage);
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
