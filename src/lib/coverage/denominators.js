/**
 * Coverage denominators and the invariant that governs how they are published.
 *
 * Org-wide policy, ruled by the Executive Director on INS-15 (E3) and binding on
 * the site, social posts, grant applications, press replies, and board updates:
 *
 *   1. Never publish a bare coverage percentage. A percentage always ships with
 *      its denominator, that denominator's source, and that denominator's year,
 *      inline, in the same sentence.
 *   2. General-purpose is the headline. The all-agency figure is reported
 *      immediately alongside it, never instead of it. The primary is chosen by
 *      what the reader means, not by which number flatters us.
 *   3. State percentages use state denominators. Never apportion a national one.
 *   4. "If a more recent authoritative roster turns up, it becomes primary and
 *      the swap is noted, not silent."
 *
 * The rule is enforced here rather than in a style guide: there is no exported
 * function that returns a percentage as a naked number or string. The only way
 * to render coverage is through formatCoverage(), which throws when the citation
 * it would need is absent.
 *
 * ---------------------------------------------------------------------------
 * INS-27: the source swap corollary 4 anticipated has now happened.
 *
 * The primary denominator was BJS LEAR 2016 (15,810 general-purpose agencies).
 * It is now BJS CSLLEA 2018, because CSLLEA 2018 is more recent, is a BJS
 * publication of the same standing, and — unlike LEAR — publishes a per-state
 * breakdown that we can lawfully redistribute. See DENOMINATOR_LINEAGE, which is
 * attached to every national coverage result so the swap renders rather than
 * hiding in a commit message.
 * ---------------------------------------------------------------------------
 */

export const UNIVERSE = Object.freeze({
  /** Local police, sheriffs' offices, and primary state agencies. */
  GENERAL_PURPOSE: "general_purpose",
  /** Every state and local agency BJS enumerates, including special jurisdiction. */
  ALL_AGENCY: "all_agency",
});

export const CITATION_STATUS = Object.freeze({
  /** Source, year, and value all verified against the cited publication. */
  CONFIRMED: "confirmed",
  /** Value is the org's working estimate; exact publication/year not yet pinned. */
  PENDING: "pending",
  /** Verified, but a later edition of the same series has replaced it. */
  SUPERSEDED: "superseded",
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
  /**
   * We hold more agencies than the denominator counts. That is never coverage
   * above 100% — it is a universe mismatch, and it is reported as one.
   */
  HELD_EXCEEDS_DENOMINATOR: "held_exceeds_denominator",
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
 * The publications every denominator below is drawn from. Kept separate from the
 * values so a denominator cannot be registered without one, and so the retrieval
 * date and URL travel with the number the way the provenance rule requires.
 */
const PUBLICATION = Object.freeze({
  CSLLEA_2018: Object.freeze({
    source: "BJS Census of State and Local Law Enforcement Agencies",
    year: 2018,
    publication:
      "Census of State and Local Law Enforcement Agencies, 2018 – Statistical Tables",
    ncj: "NCJ 302187",
    publishedOn: "2022-10-19",
    sourceUrl:
      "https://bjs.ojp.gov/library/publications/census-state-and-local-law-enforcement-agencies-2018-statistical-tables",
    retrievedOn: "2026-08-24",
    /** Reference period, which is not the same as the publication date. */
    referencePeriod: "June 2018",
  }),
  CSLLEA_2008: Object.freeze({
    source: "BJS Census of State and Local Law Enforcement Agencies",
    year: 2008,
    publication: "Census of State and Local Law Enforcement Agencies, 2008",
    ncj: "NCJ 233982",
    publishedOn: "2011-07-01",
    sourceUrl:
      "https://bjs.ojp.gov/library/publications/census-state-and-local-law-enforcement-agencies-2008",
    retrievedOn: "2026-08-24",
    referencePeriod: "September 2008",
  }),
  LEAR_2016: Object.freeze({
    source: "BJS Law Enforcement Agency Roster",
    year: 2016,
    publication: "Law Enforcement Agency Roster (LEAR), 2016",
    ncj: "ICPSR 36697",
    publishedOn: null,
    sourceUrl: "https://www.icpsr.umich.edu/web/NACJD/studies/36697",
    retrievedOn: null,
    referencePeriod: "December 2016",
  }),
});

/**
 * National denominators. Every entry carries the citation it must be published
 * with. Adding an entry without source/year/value makes assertPublishable throw,
 * which is the point.
 */
const NATIONAL_DENOMINATORS = Object.freeze({
  csllea_2018_general_purpose: Object.freeze({
    id: "csllea_2018_general_purpose",
    universe: UNIVERSE.GENERAL_PURPOSE,
    scope: "national",
    value: 14924,
    approximate: false,
    noun: "general-purpose agencies",
    ...PUBLICATION.CSLLEA_2018,
    citationStatus: CITATION_STATUS.CONFIRMED,
    derived: true,
    derivedFrom:
      "Table 1 of NCJ 302187: local police (11,824) + sheriffs' offices (3,051) + primary state (49). Each addend is published; the subtotal is not, so it is marked derived.",
    /**
     * BJS does not publish a combined standard error for this subtotal and it
     * cannot be recovered from the component errors without their covariance.
     * We do not invent one.
     */
    standardError: null,
    note: "Municipal and county police departments, sheriffs' offices, and primary state agencies — the universe a reader means by 'police department'. Excludes the 217 tribal police departments BJS counts as a separate type; see DEFINITIONAL_CONFLICTS.",
  }),
  csllea_2018_all_agency: Object.freeze({
    id: "csllea_2018_all_agency",
    universe: UNIVERSE.ALL_AGENCY,
    scope: "national",
    value: 17541,
    approximate: false,
    noun: "law enforcement agencies of all types",
    ...PUBLICATION.CSLLEA_2018,
    citationStatus: CITATION_STATUS.CONFIRMED,
    derived: false,
    derivedFrom: null,
    standardError: 0.05,
    note: "Published directly in table 1 of NCJ 302187. Replaces the unpinned ~18,000 estimate this codebase previously carried. Excludes agencies employing less than one full-time-equivalent sworn officer.",
  }),

  // --- Superseded. Retained so existing citations still resolve, and so the
  // --- swap is visible in the registry rather than only in git history.
  lear_2016_general_purpose: Object.freeze({
    id: "lear_2016_general_purpose",
    universe: UNIVERSE.GENERAL_PURPOSE,
    scope: "national",
    value: 15810,
    approximate: false,
    noun: "general-purpose agencies",
    ...PUBLICATION.LEAR_2016,
    citationStatus: CITATION_STATUS.SUPERSEDED,
    supersededById: "csllea_2018_general_purpose",
    derived: false,
    derivedFrom: null,
    standardError: null,
    note: "12,695 local and county police departments + 3,066 sheriffs' offices + 49 primary state. Was the primary until INS-27. Superseded by CSLLEA 2018, which is two years newer and publishes a per-state breakdown. LEAR's own per-state breakdown was never obtained; see the ACQUISITION note in this file.",
  }),
  csllea_2008_all_agency: Object.freeze({
    id: "csllea_2008_all_agency",
    universe: UNIVERSE.ALL_AGENCY,
    scope: "national",
    value: 17985,
    approximate: false,
    noun: "law enforcement agencies of all types",
    ...PUBLICATION.CSLLEA_2008,
    citationStatus: CITATION_STATUS.SUPERSEDED,
    supersededById: "csllea_2018_all_agency",
    derived: false,
    derivedFrom: null,
    standardError: null,
    note: "This is the number behind the '~18,000' everyone repeats: 12,501 local police + 3,063 sheriffs' offices + 50 primary state + 1,733 special jurisdiction + 638 constable/marshal. Pinning it was half of INS-27. Having pinned it, it is superseded — a 2008 figure is not a current denominator.",
  }),
});

/** The headline figure. Does not move if the other number starts looking better. */
export const PRIMARY_NATIONAL_DENOMINATOR_ID = "csllea_2018_general_purpose";
/** Reported immediately alongside the primary, never instead of it. */
export const SECONDARY_NATIONAL_DENOMINATOR_ID = "csllea_2018_all_agency";

/**
 * Attached to every national coverage result. Corollary 4 of the ED ruling says
 * a source swap is "noted, not silent" — this is the mechanism that notes it, so
 * that a reader of the report sees the change rather than having to diff us.
 */
export const DENOMINATOR_LINEAGE = Object.freeze([
  Object.freeze({
    universe: UNIVERSE.GENERAL_PURPOSE,
    fromId: "lear_2016_general_purpose",
    toId: "csllea_2018_general_purpose",
    changedOn: "2026-08-24",
    issue: "INS-27",
    reason:
      "BJS CSLLEA 2018 (NCJ 302187, published October 2022) is a more recent authoritative enumeration than LEAR 2016 and publishes per-state counts. The headline general-purpose denominator moves from 15,810 (2016) to 14,924 (2018).",
  }),
  Object.freeze({
    universe: UNIVERSE.ALL_AGENCY,
    fromId: "csllea_2008_all_agency",
    toId: "csllea_2018_all_agency",
    changedOn: "2026-08-24",
    issue: "INS-27",
    reason:
      "The unpinned '~18,000' was traced to CSLLEA 2008's 17,985 (NCJ 233982, September 2008 reference period) and then retired in favour of CSLLEA 2018's 17,541. The estimate is no longer registered: a number we repeated because everyone repeats it is not a denominator.",
  }),
]);

/**
 * Source disagreements we are carrying rather than resolving. These are signal
 * about the domain, not noise, and they belong in the coverage report next to
 * the numbers they affect.
 */
export const DEFINITIONAL_CONFLICTS = Object.freeze([
  Object.freeze({
    id: "local_police_count_lear_vs_csllea",
    detail:
      "LEAR 2016 counts 12,695 local and county police departments; CSLLEA 2018 counts 11,824. The gap of 871 is larger than two years of consolidation plausibly explains. CSLLEA excludes any agency without at least one full-time-equivalent sworn officer and LEAR does not, which accounts for an unknown share of it. We have not reconciled the two and do not claim to have.",
  }),
  Object.freeze({
    id: "tribal_police_universe",
    detail:
      "BJS classifies the 217 tribal police departments as their own type, outside 'general purpose'. A reader would call a tribal police department general-purpose. Our general-purpose denominator follows the BJS definition so it stays comparable to the published tables; tribal agencies are inside the all-agency denominator. If we ever report tribal coverage it needs its own denominator, not a share of this one.",
  }),
  Object.freeze({
    id: "state_counts_are_estimates",
    detail:
      "The per-state agency counts in CSLLEA 2018 table 3 carry standard errors (appendix table 3) — they are estimates, not exact enumerations. Summing the 51 published state rows gives 17,540 against a published national total of 17,541 (local police 11,825 vs 11,824; sheriffs' offices 3,054 vs 3,051). BJS notes details may not sum to totals. We store the published state values and the published standard errors, and do not force them to reconcile.",
  }),
]);

/**
 * ACQUISITION NOTE — LEAR 2016 per-state breakdown, not obtained.
 *
 * The original INS-27 ask was to load per-state counts from LEAR 2016 itself.
 * The LEAR microdata is distributed by ICPSR/NACJD (study 36697) and requires an
 * ICPSR account and agreement to their terms before download. ICPSR's robots.txt
 * permits the study path, but their edge returned HTTP 403 to our client on
 * 2026-08-24. We did not attempt to work around that block. No per-state
 * tabulation of LEAR 2016 is published by BJS outside the microdata.
 *
 * The deliverable was met from CSLLEA 2018 instead, which is newer, is public
 * domain, and publishes exactly the breakdown we needed. Obtaining LEAR itself
 * is now only useful as an agency *roster* for entity resolution, not as a
 * denominator, and is tracked separately.
 */

/**
 * State-level denominators, from table 3 of NCJ 302187.
 *
 * Columns: USPS code, all-agency count, local police, sheriffs' offices,
 * primary state agencies, and the standard errors published in appendix table 3
 * for the all-agency, local police, and sheriffs' columns respectively.
 *
 * Sheriffs' offices are 0 — not missing — in AK, CT, DE, HI, and DC, where BJS
 * records that no sheriff's office has primary law enforcement responsibility.
 * Primary state agencies are 1 everywhere except HI (no state police department)
 * and DC (not a state); those 49 match the 49 agencies in table 13 exactly.
 */
const STATE_ROWS = Object.freeze([
  // code, all, localPolice, sheriffs, primaryState, seAll, seLocal, seSheriff
  ["AK", 49, 37, 0, 1, 1.7, 1.6, null],
  ["AL", 401, 297, 62, 1, 4.7, 4.2, 1.7],
  ["AR", 364, 255, 77, 1, 5, 4.5, 2],
  ["AZ", 131, 78, 14, 1, 2.5, 1.6, 0.7],
  ["CA", 531, 336, 60, 1, 4, 2.9, 1.4],
  ["CO", 239, 155, 62, 1, 3.6, 3, 1.8],
  ["CT", 135, 113, 0, 1, 2.2, 1.9, null],
  ["DC", 3, 1, 0, 0, 0.4, 0.1, null],
  ["DE", 43, 34, 0, 1, 1.4, 1.3, null],
  ["FL", 373, 261, 67, 1, 3.4, 2.8, 1.5],
  ["GA", 608, 346, 156, 1, 5.5, 4.3, 2.6],
  ["HI", 8, 4, 0, 0, 0.4, 0.2, null],
  ["IA", 424, 264, 101, 1, 5.3, 4.5, 2.4],
  ["ID", 112, 63, 40, 1, 2.6, 1.9, 1.4],
  ["IL", 846, 676, 104, 1, 6.6, 6, 2.3],
  ["IN", 476, 354, 95, 1, 5.6, 5, 2.2],
  ["KS", 364, 217, 106, 1, 5, 4, 2.5],
  ["KY", 357, 216, 115, 1, 4.7, 3.8, 2.6],
  ["LA", 326, 222, 63, 1, 4.4, 4, 1.4],
  ["MA", 374, 325, 14, 1, 3.7, 3.4, 0.7],
  ["MD", 138, 81, 24, 1, 2.5, 1.9, 0.9],
  ["ME", 144, 109, 17, 1, 2.7, 2.3, 0.9],
  ["MI", 564, 427, 86, 1, 5.6, 4.9, 2],
  ["MN", 417, 304, 87, 1, 5.1, 4.4, 2.1],
  ["MO", 558, 415, 113, 1, 5.8, 5.2, 2.5],
  ["MS", 351, 191, 82, 1, 4.5, 3.5, 2.1],
  ["MT", 121, 49, 56, 1, 2.8, 1.8, 1.9],
  ["NC", 516, 344, 101, 1, 4.7, 3.9, 1.9],
  ["ND", 113, 50, 53, 1, 3, 2.2, 1.9],
  ["NE", 210, 108, 89, 1, 3.9, 2.9, 2.3],
  ["NH", 212, 193, 11, 1, 3.6, 3.5, 0.8],
  ["NJ", 507, 458, 20, 1, 3.8, 3.5, 0.8],
  ["NM", 140, 69, 32, 1, 3.1, 2, 1.3],
  ["NV", 65, 14, 17, 1, 2, 0.7, 0.9],
  ["NY", 528, 396, 58, 1, 4.7, 4.1, 1.5],
  ["OH", 806, 654, 90, 1, 6.3, 5.8, 1.9],
  ["OK", 456, 311, 75, 1, 5.7, 4.8, 2.1],
  ["OR", 167, 116, 35, 1, 3, 2.4, 1.3],
  ["PA", 995, 896, 59, 1, 7.4, 7.1, 1.8],
  ["RI", 49, 39, 1, 1, 1.2, 1, 0.2],
  ["SC", 262, 176, 45, 1, 3.6, 3.1, 1.3],
  ["SD", 145, 64, 68, 1, 3.4, 2.4, 2.1],
  ["TN", 363, 243, 90, 1, 4.3, 3.7, 2],
  ["TX", 1935, 788, 252, 1, 8.2, 6.5, 3.5],
  ["UT", 140, 91, 29, 1, 2.6, 2, 1.2],
  ["VA", 339, 166, 122, 1, 4, 2.9, 2.3],
  ["VT", 73, 52, 14, 1, 2.1, 1.7, 0.9],
  ["WA", 254, 169, 40, 1, 3.7, 2.8, 1.3],
  ["WI", 519, 411, 74, 1, 5.7, 5.2, 1.8],
  ["WV", 212, 139, 56, 1, 3.9, 3.4, 1.8],
  ["WY", 77, 48, 22, 1, 2.2, 1.8, 1.1],
]);

/**
 * Built rather than written out, so that every state denominator inherits the
 * same publication block. There is no way to add a state without its citation
 * because the citation is not a per-row field.
 */
const STATE_DENOMINATORS = new Map(
  STATE_ROWS.map(
    ([
      code,
      all,
      localPolice,
      sheriffs,
      primaryState,
      seAll,
      seLocal,
      seSheriff,
    ]) => [
      code,
      Object.freeze({
        [UNIVERSE.GENERAL_PURPOSE]: Object.freeze({
          id: `csllea_2018_general_purpose_${code}`,
          universe: UNIVERSE.GENERAL_PURPOSE,
          scope: code,
          value: localPolice + sheriffs + primaryState,
          approximate: false,
          noun: `general-purpose agencies in ${code}`,
          ...PUBLICATION.CSLLEA_2018,
          citationStatus: CITATION_STATUS.CONFIRMED,
          derived: true,
          derivedFrom: `Table 3 of NCJ 302187: local police (${localPolice}) + sheriffs' offices (${sheriffs}); plus ${primaryState} primary state agency per table 13.`,
          standardError: null,
          componentStandardErrors: Object.freeze({
            localPolice: seLocal,
            sheriffs: seSheriff,
          }),
          components: Object.freeze({ localPolice, sheriffs, primaryState }),
        }),
        [UNIVERSE.ALL_AGENCY]: Object.freeze({
          id: `csllea_2018_all_agency_${code}`,
          universe: UNIVERSE.ALL_AGENCY,
          scope: code,
          value: all,
          approximate: false,
          noun: `law enforcement agencies of all types in ${code}`,
          ...PUBLICATION.CSLLEA_2018,
          citationStatus: CITATION_STATUS.CONFIRMED,
          derived: false,
          derivedFrom: null,
          standardError: seAll,
        }),
      }),
    ],
  ),
);

export const getDenominator = (id) => {
  const denominator = NATIONAL_DENOMINATORS[id];
  if (!denominator) {
    throw new CoverageProvenanceError(
      `Unknown coverage denominator "${id}". Coverage may only be reported against a registered denominator.`,
    );
  }
  return denominator;
};

export const getStateDenominator = (
  stateCode,
  universe = UNIVERSE.GENERAL_PURPOSE,
) =>
  STATE_DENOMINATORS.get(String(stateCode).toUpperCase())?.[universe] ?? null;

/** USPS codes we hold a denominator for, so a report can enumerate its own coverage. */
export const listStateDenominatorCodes = () =>
  Object.freeze([...STATE_DENOMINATORS.keys()].sort());

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
    const reason =
      denominator.citationStatus === CITATION_STATUS.SUPERSEDED
        ? `has been superseded by "${denominator.supersededById}"`
        : "has an unconfirmed citation";
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" ${reason} and may not be published to a public audience.`,
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
  // A subtotal we computed is not a figure the source published. It may be used,
  // but only if it says out loud how it was arrived at.
  if (denominator.derived && !denominator.derivedFrom) {
    throw new CoverageProvenanceError(
      `Coverage denominator "${denominator.id}" is derived but does not record what it was derived from. A subtotal we computed is not a figure the source published.`,
    );
  }
  return true;
};

/**
 * "14,924 general-purpose agencies (BJS Census of State and Local Law
 * Enforcement Agencies, 2018)"
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
    denominatorDerived: Boolean(denominator.derived),
    percent,
    stale,
    denominatorAgeYears: age,
    sentence,
  });
};

const staleGap = (denominator, scope, age) => ({
  kind: GAP_KIND.DENOMINATOR_STALE,
  scope,
  denominatorId: denominator.id,
  detail: `${denominator.source} is from ${denominator.year}, ${age} years before this report.`,
  unblockedBy:
    "BJS fielded the 2022 CSLLEA but has not published it. When it lands it becomes primary and the swap is recorded in DENOMINATOR_LINEAGE.",
});

const exceedsGap = (denominator, scope, held) => ({
  kind: GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
  scope,
  denominatorId: denominator.id,
  detail: `${held.toLocaleString("en-US")} agencies held against a denominator of ${denominator.value.toLocaleString("en-US")} (${denominator.source}, ${denominator.year}). Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage is reported.`,
  unblockedBy:
    "Reconcile the held agencies against the denominator's universe — CSLLEA excludes agencies with less than one full-time-equivalent sworn officer, and counts tribal and special-jurisdiction agencies as separate types.",
});

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
  const gaps = [];

  const measure = (held, denominator) => {
    if (held > denominator.value) {
      gaps.push(exceedsGap(denominator, "national", held));
      return null;
    }
    try {
      return formatCoverage({ held, denominator, asOfYear, audience });
    } catch (error) {
      if (!(error instanceof CoverageProvenanceError)) {
        throw error;
      }
      gaps.push({
        kind: GAP_KIND.CITATION_UNCONFIRMED,
        scope: "national",
        denominatorId: denominator.id,
        detail: error.message,
        unblockedBy:
          "Register a denominator whose publication and year have been verified against the source.",
      });
      return null;
    }
  };

  const primary = measure(heldGeneralPurpose, primaryDenominator);
  const secondary = measure(heldAllAgency, secondaryDenominator);

  for (const denominator of [primaryDenominator, secondaryDenominator]) {
    const age = stalenessYears(denominator, asOfYear);
    if (age >= STALENESS_THRESHOLD_YEARS) {
      gaps.push(staleGap(denominator, "national", age));
    }
  }

  return Object.freeze({
    primary,
    secondary,
    gaps: Object.freeze(gaps),
    lineage: DENOMINATOR_LINEAGE,
    conflicts: DEFINITIONAL_CONFLICTS,
  });
};

/**
 * State coverage. Uses that state's own denominator — never an apportioned share
 * of the national one — and returns a named gap instead of a percentage whenever
 * the denominator is missing or the numerator does not fit inside it.
 */
export const stateCoverage = ({
  stateCode,
  held,
  asOfYear,
  audience = AUDIENCE.INTERNAL,
  universe = UNIVERSE.GENERAL_PURPOSE,
}) => {
  const code = String(stateCode).toUpperCase();
  const denominator = getStateDenominator(code, universe);

  if (!denominator) {
    return Object.freeze({
      stateCode: code,
      universe,
      held,
      coverage: null,
      gap: Object.freeze({
        kind: GAP_KIND.NO_STATE_DENOMINATOR,
        scope: code,
        detail: `${held.toLocaleString("en-US")} agencies held in ${code}. No state-level denominator on file for the ${universe} universe, so no coverage percentage is reported. A national denominator is not apportioned to produce one.`,
        unblockedBy:
          "Load the per-state counts for this universe from an authoritative published tabulation.",
      }),
    });
  }

  if (held > denominator.value) {
    return Object.freeze({
      stateCode: code,
      universe,
      held,
      coverage: null,
      gap: Object.freeze(exceedsGap(denominator, code, held)),
    });
  }

  return Object.freeze({
    stateCode: code,
    universe,
    held,
    coverage: formatCoverage({ held, denominator, asOfYear, audience }),
    gap: null,
  });
};
