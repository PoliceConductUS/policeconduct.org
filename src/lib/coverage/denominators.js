/**
 * Coverage denominators and the invariant that governs how they are published.
 *
 * Org-wide policy, ruled by the Executive Director on INS-15 (E3) and binding on
 * the site, social posts, grant applications, press replies, and board updates:
 *
 *   1. Never publish a bare coverage percentage. A percentage always ships with
 *      its denominator, that denominator's source, and that denominator's year,
 *      inline, in the same sentence.
 *   2. General-purpose (BJS LEAR, 15,810) is the headline. The all-agency figure
 *      is reported immediately alongside it, never instead of it. The primary is
 *      chosen by what the reader means, not by which number flatters us.
 *   3. State percentages use state denominators. Never apportion a national one.
 *
 * The rule is enforced here rather than in a style guide: there is no exported
 * function that returns a percentage as a naked number or string. The only way
 * to render coverage is through formatCoverage(), which throws when the citation
 * it would need is absent.
 */

export const UNIVERSE = Object.freeze({
  GENERAL_PURPOSE: "general_purpose",
  ALL_AGENCY: "all_agency",
});

export const CITATION_STATUS = Object.freeze({
  /** Source, year, and value all verified against the cited publication. */
  CONFIRMED: "confirmed",
  /** Value is the org's working estimate; exact publication/year not yet pinned. */
  PENDING: "pending",
});

export const AUDIENCE = Object.freeze({
  /** Anything a member of the public can read: site, social, grants, press. */
  PUBLIC: "public",
  /** Internal reports, board updates that are explicitly marked internal. */
  INTERNAL: "internal",
});

/**
 * Named gaps. A gap is a finding that directs acquisition work, not a rounding
 * decision and not something a percentage is allowed to absorb silently.
 */
export const GAP_KIND = Object.freeze({
  /** No state-level denominator on file, so no state percentage may be shown. */
  NO_STATE_DENOMINATOR: "no_state_denominator",
  /** We hold an agency the roster does not list. */
  HELD_NOT_IN_ROSTER: "held_not_in_roster",
  /** The roster lists an agency we do not hold. */
  IN_ROSTER_NOT_HELD: "in_roster_not_held",
  /** State has no open source we can lawfully ingest yet. */
  NO_USABLE_SOURCE: "no_usable_source",
  /** Denominator exists but its vintage is old enough to distort the reading. */
  DENOMINATOR_STALE: "denominator_stale",
  /** Denominator's citation is not yet confirmed, so it cannot go public. */
  CITATION_UNCONFIRMED: "citation_unconfirmed",
});

export class CoverageProvenanceError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoverageProvenanceError";
  }
}

/** Vintage past which a denominator is reported with an explicit staleness note. */
export const STALENESS_THRESHOLD_YEARS = 5;

/**
 * National denominators. Every entry carries the citation it must be published
 * with. Adding an entry without source/year/value makes assertPublishable throw,
 * which is the point.
 */
const NATIONAL_DENOMINATORS = Object.freeze({
  lear_2016_general_purpose: Object.freeze({
    id: "lear_2016_general_purpose",
    universe: UNIVERSE.GENERAL_PURPOSE,
    scope: "national",
    value: 15810,
    approximate: false,
    noun: "general-purpose agencies",
    source: "BJS Law Enforcement Agency Roster",
    year: 2016,
    citationStatus: CITATION_STATUS.CONFIRMED,
    note: "Municipal police departments and sheriffs' offices — the universe a reader means by 'police department'.",
  }),
  all_agency_estimate: Object.freeze({
    id: "all_agency_estimate",
    universe: UNIVERSE.ALL_AGENCY,
    scope: "national",
    value: 18000,
    approximate: true,
    noun: "law enforcement agencies of all types",
    source: null,
    year: null,
    citationStatus: CITATION_STATUS.PENDING,
    note: "Working org estimate including special-jurisdiction agencies. It is widely repeated but we have not pinned it to a publication or a vintage, and we do not assert an attribution we have not checked. Until someone does, it renders nowhere; see INS-7 named gap CITATION_UNCONFIRMED.",
  }),
});

/** The headline figure. Does not move if the other number starts looking better. */
export const PRIMARY_NATIONAL_DENOMINATOR_ID = "lear_2016_general_purpose";
/** Reported immediately alongside the primary, never instead of it. */
export const SECONDARY_NATIONAL_DENOMINATOR_ID = "all_agency_estimate";

/**
 * State-level denominators, keyed by USPS code.
 *
 * Deliberately empty. We do not hold a verified per-state breakdown of the BJS
 * LEAR 2016 general-purpose roster, and corollary 3 of the ED ruling forbids
 * deriving a state figure by apportioning the national one. Until this map is
 * populated from the roster itself, every state reports as a NO_STATE_DENOMINATOR
 * gap and no state percentage is produced. Under-reporting coverage is fine;
 * inventing a denominator is not.
 */
const STATE_DENOMINATORS = new Map();

export const getDenominator = (id) => {
  const denominator = NATIONAL_DENOMINATORS[id];
  if (!denominator) {
    throw new CoverageProvenanceError(
      `Unknown coverage denominator "${id}". Coverage may only be reported against a registered denominator.`,
    );
  }
  return denominator;
};

export const getStateDenominator = (stateCode) =>
  STATE_DENOMINATORS.get(String(stateCode).toUpperCase()) ?? null;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * Throws unless the denominator carries everything the ruling requires it to be
 * published with, for the given audience.
 */
export const assertPublishable = (denominator, audience) => {
  if (!denominator || typeof denominator !== "object") {
    throw new CoverageProvenanceError("Coverage denominator is missing.");
  }
  // Whether it is allowed out at all comes before whether it is well formed.
  if (
    audience === AUDIENCE.PUBLIC &&
    denominator.citationStatus !== CITATION_STATUS.CONFIRMED
  ) {
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" has an unconfirmed citation and may not be published to a public audience.`,
    );
  }
  if (!isPositiveInteger(denominator.value)) {
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" has no usable value.`,
    );
  }
  if (!denominator.source) {
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" has no source. A percentage without its denominator's source is not a metric.`,
    );
  }
  if (!Number.isInteger(denominator.year)) {
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" has no year. A denominator is never presented without its vintage.`,
    );
  }
  return true;
};

/**
 * "15,810 general-purpose agencies (BJS Law Enforcement Agency Roster, 2016)"
 *
 * The citation is not an optional suffix — it is part of the rendered number.
 */
export const formatDenominator = (
  denominator,
  { audience = AUDIENCE.PUBLIC } = {},
) => {
  assertPublishable(denominator, audience);
  const value = `${denominator.approximate ? "~" : ""}${denominator.value.toLocaleString("en-US")}`;
  return `${value} ${denominator.noun} (${denominator.source}, ${denominator.year})`;
};

const stalenessYears = (denominator, asOfYear) => asOfYear - denominator.year;

/**
 * The only way to express coverage. Returns a structured result whose `sentence`
 * always contains the numerator, the denominator, the denominator's source, and
 * the denominator's year. There is no code path that yields a bare percentage.
 */
export const formatCoverage = ({
  held,
  denominator,
  asOfYear,
  audience = AUDIENCE.PUBLIC,
}) => {
  if (!Number.isInteger(held) || held < 0) {
    throw new CoverageProvenanceError(
      "Coverage numerator must be a non-negative integer count of agencies actually held.",
    );
  }
  if (!Number.isInteger(asOfYear)) {
    throw new CoverageProvenanceError(
      "Coverage reporting requires the year it is being reported in, to compute denominator staleness.",
    );
  }
  assertPublishable(denominator, audience);

  const percent = (held / denominator.value) * 100;
  const rendered = percent >= 10 ? percent.toFixed(0) : percent.toFixed(1);
  const age = stalenessYears(denominator, asOfYear);
  const stale = age >= STALENESS_THRESHOLD_YEARS;

  const sentence = stale
    ? `${held.toLocaleString("en-US")} of ${formatDenominator(denominator, { audience })} — ${rendered}%. That denominator is ${age} years old and is not a current count; agencies have consolidated, disbanded, and been created since.`
    : `${held.toLocaleString("en-US")} of ${formatDenominator(denominator, { audience })} — ${rendered}%.`;

  return Object.freeze({
    held,
    denominatorId: denominator.id,
    denominatorValue: denominator.value,
    denominatorSource: denominator.source,
    denominatorYear: denominator.year,
    percent,
    stale,
    denominatorAgeYears: age,
    sentence,
  });
};

/**
 * National coverage. Always returns both figures — primary first, secondary
 * alongside — because the ruling forbids reporting one without the other.
 */
export const nationalCoverage = ({
  heldGeneralPurpose,
  heldAllAgency,
  asOfYear,
  audience = AUDIENCE.INTERNAL,
}) => {
  const primaryDenominator = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);
  const secondaryDenominator = getDenominator(
    SECONDARY_NATIONAL_DENOMINATOR_ID,
  );

  const primary = formatCoverage({
    held: heldGeneralPurpose,
    denominator: primaryDenominator,
    asOfYear,
    audience,
  });

  const gaps = [];
  let secondary = null;
  try {
    secondary = formatCoverage({
      held: heldAllAgency,
      denominator: secondaryDenominator,
      asOfYear,
      audience,
    });
  } catch (error) {
    if (!(error instanceof CoverageProvenanceError)) {
      throw error;
    }
    gaps.push({
      kind: GAP_KIND.CITATION_UNCONFIRMED,
      scope: "national",
      denominatorId: secondaryDenominator.id,
      detail: error.message,
      unblockedBy:
        "Pin the publication and year behind the ~18,000 all-agency estimate, or replace it with a confirmed roster.",
    });
  }

  if (primary.stale) {
    gaps.push({
      kind: GAP_KIND.DENOMINATOR_STALE,
      scope: "national",
      denominatorId: primaryDenominator.id,
      detail: `${primaryDenominator.source} is from ${primaryDenominator.year}, ${primary.denominatorAgeYears} years before this report.`,
      unblockedBy:
        "If a more recent authoritative roster is found it becomes primary, and the swap is noted rather than made silently.",
    });
  }

  return Object.freeze({ primary, secondary, gaps: Object.freeze(gaps) });
};

/**
 * State coverage. Returns a gap rather than a percentage whenever the state
 * denominator is missing — which, today, is every state.
 */
export const stateCoverage = ({
  stateCode,
  held,
  asOfYear,
  audience = AUDIENCE.INTERNAL,
}) => {
  const code = String(stateCode).toUpperCase();
  const denominator = getStateDenominator(code);

  if (!denominator) {
    return Object.freeze({
      stateCode: code,
      held,
      coverage: null,
      gap: Object.freeze({
        kind: GAP_KIND.NO_STATE_DENOMINATOR,
        scope: code,
        detail: `${held.toLocaleString("en-US")} agencies held in ${code}. No state-level denominator on file, so no coverage percentage is reported. A national denominator is not apportioned to produce one.`,
        unblockedBy:
          "Load the per-state general-purpose counts from the BJS Law Enforcement Agency Roster (2016) into STATE_DENOMINATORS.",
      }),
    });
  }

  return Object.freeze({
    stateCode: code,
    held,
    coverage: formatCoverage({ held, denominator, asOfYear, audience }),
    gap: null,
  });
};
