/**
 * ---------------------------------------------------------------------------
 * Agency type, sourced per agency — the thing that was blocking every coverage
 * percentage (INS-79, under INS-7).
 *
 * The coverage report could not divide held agencies by a BJS denominator
 * because nothing in `public.agency` said what *kind* of agency each row is.
 * Our state sources enumerate **entities that employ licensed peace officers**,
 * which is a different population from **law enforcement agencies of a given
 * BJS type**. Dividing one by the other is not a coverage figure, so the report
 * emitted a NUMERATOR_UNIVERSE_UNVERIFIED gap and published ceilings instead.
 *
 * This module supplies the missing classification and, more importantly, the
 * rules that keep it honest:
 *
 *   1. A type must be SOURCED, never inferred from the agency's name. Name
 *      patterns were tested on INS-79 and left 1,694 of 2,883 Texas records
 *      unclassified; worse, a name classifier produces a confident-looking
 *      label with nothing behind it. Here a type either comes from a named
 *      source row or the agency is `unclassified` and says so.
 *
 *   2. The source's own vocabulary and the BJS vocabulary are kept apart. TCOLE
 *      says "Constable (CCP 2.12 (2))". BJS says "constable/marshal". The first
 *      is sourced data; the second is our reading of it. They are stored in
 *      different fields and the mapping between them is published with a
 *      rationale per entry, because the mapping is the part a reader is
 *      entitled to disagree with.
 *
 *   3. An unrecognised source type is an error, not an "other". If TCOLE adds a
 *      department type next year, `classifyTcoleDepartmentType` throws rather
 *      than quietly bucketing it somewhere that moves a published percentage.
 *
 *   4. Not every agency we hold is in the BJS universe at all. District
 *      attorney investigators, community-supervision departments and 911
 *      centres employ licensed peace officers and are legitimately in our
 *      corpus, but CSLLEA does not count them — they are covered by different
 *      BJS collections. They get `not_in_csllea_universe`, which removes them
 *      from both the numerator and the "why do we hold more than the
 *      denominator" mystery. That category is the single biggest reason Texas
 *      looked like 2.8x its own general-purpose count.
 * ---------------------------------------------------------------------------
 */

/**
 * BJS CSLLEA categories. Named to match the published breakdown so the
 * arithmetic in the report can be checked against table 1 of the publication
 * rather than against our prose.
 *
 * CSLLEA 2008's published breakdown (carried in denominators.js) is the
 * clearest statement of the structure: local police + sheriffs' offices +
 * primary state + special jurisdiction + constable/marshal = all agencies.
 * "General-purpose" is the first three. Constable/marshal is NOT general
 * purpose, which matters enormously in Texas, where constables outnumber
 * sheriffs almost three to one.
 */
export const BJS_CATEGORY = Object.freeze({
  /** Municipal and county police departments. */
  LOCAL_POLICE: "local_police",
  /** Sheriffs' offices. */
  SHERIFF: "sheriff",
  /** The one primary state law enforcement agency BJS counts per state. */
  PRIMARY_STATE: "primary_state",
  /** Counted in the all-agency total; explicitly not general-purpose. */
  CONSTABLE_MARSHAL: "constable_marshal",
  /** Campus, transit, airport, park, hospital, fire-marshal and similar. */
  SPECIAL_JURISDICTION: "special_jurisdiction",
  /** BJS counts tribal police as their own type, outside general-purpose. */
  TRIBAL: "tribal",
  /** Federal. CSLLEA counts state and local agencies only. */
  FEDERAL: "federal",
  /**
   * A real agency employing licensed peace officers that CSLLEA does not
   * enumerate at all — prosecutors' investigators, probation and parole,
   * courts, jails, 911 centres, licensing bodies and academies. In neither
   * numerator and in neither denominator.
   */
  NOT_IN_CSLLEA_UNIVERSE: "not_in_csllea_universe",
  /**
   * The source places this employer in another state, so it is not part of the
   * holding state's count even though the holding state's source lists it.
   */
  OUT_OF_STATE: "out_of_state",
  /** No sourced type is available. Never a guess, always a named gap. */
  UNCLASSIFIED: "unclassified",
});

/** The three categories that sum to a BJS general-purpose count. */
export const GENERAL_PURPOSE_CATEGORIES = Object.freeze([
  BJS_CATEGORY.LOCAL_POLICE,
  BJS_CATEGORY.SHERIFF,
  BJS_CATEGORY.PRIMARY_STATE,
]);

/**
 * The categories CSLLEA's all-agency total covers. Federal, out-of-state and
 * the not-in-universe bucket are deliberately absent: counting them would
 * reproduce exactly the bug this module exists to fix.
 */
export const ALL_AGENCY_CATEGORIES = Object.freeze([
  ...GENERAL_PURPOSE_CATEGORIES,
  BJS_CATEGORY.CONSTABLE_MARSHAL,
  BJS_CATEGORY.SPECIAL_JURISDICTION,
]);

export class AgencyTypeProvenanceError extends Error {
  constructor(message) {
    super(message);
    this.name = "AgencyTypeProvenanceError";
  }
}

export class UnknownSourceTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnknownSourceTypeError";
  }
}

/**
 * Where a classification can come from. Mirrors PUBLICATION in denominators.js:
 * the citation lives next to the data so a type cannot be registered without
 * one, and the retrieval identity travels with every classified agency.
 */
export const CLASSIFICATION_SOURCE = Object.freeze({
  TCOLE_PIA_2025_02_10: Object.freeze({
    id: "tcole_pia_2025_02_10",
    sourceDataset: "Texas Commission on Law Enforcement — Departments roster",
    /**
     * Public Information Act production, not a scrape. The request identifier
     * is the filename TCOLE returned, which is the only identifier the
     * production carries.
     */
    recordsRequestId: "PublicInformationRequest_2025-02-10_1410.xlsx",
    sourceUrl: null,
    retrievedOn: "2025-02-10",
    /**
     * The field read. Named explicitly so a reader can ask TCOLE for the same
     * column and check us.
     */
    sourceField: "DEPARTMENT_TYPE",
    /**
     * TCOLE's own classification of the employer, carrying Texas Code of
     * Criminal Procedure art. 2.12 subsection citations in the labels
     * themselves. This is the regulator's categorisation of the entity it
     * licenses, which is as authoritative a per-agency type as Texas offers.
     */
    confidence: "high",
    note: "TCOLE assigns DEPARTMENT_TYPE to every department it registers. The labels cite CCP art. 2.12 subsections, the statute that enumerates who is a peace officer in Texas, so the source vocabulary is statutory rather than editorial.",
  }),
});

/**
 * TCOLE DEPARTMENT_TYPE -> BJS category.
 *
 * Exhaustive over the 36 distinct values present in the 2025-02-10 production.
 * Each entry carries why, because the mapping — unlike the source type — is our
 * judgement and a reader is entitled to audit it.
 */
export const TCOLE_DEPARTMENT_TYPE_MAP = Object.freeze({
  "Municipal (CCP 2.12 (3))": Object.freeze({
    category: BJS_CATEGORY.LOCAL_POLICE,
    why: "A city police department. CSLLEA's 'local police' category.",
  }),
  "Sheriff (CCP 2.12 (1))": Object.freeze({
    category: BJS_CATEGORY.SHERIFF,
    why: "An elected sheriff's office. CSLLEA counts these separately from local police and includes both in general-purpose.",
  }),
  "Constable (CCP 2.12 (2))": Object.freeze({
    category: BJS_CATEGORY.CONSTABLE_MARSHAL,
    why: "CSLLEA counts constables' offices in its own 'constable/marshal' category and excludes them from general-purpose. Texas elects a constable per justice-of-the-peace precinct, so one county yields several offices — this is the largest single reason the Texas record count exceeds the state's general-purpose denominator.",
  }),
  "City Marshal (CCP 2.12 (3))": Object.freeze({
    category: BJS_CATEGORY.CONSTABLE_MARSHAL,
    why: "Grouped with constables by CSLLEA. Note that TCOLE cites the same art. 2.12(3) subsection as for municipal police; the statutory citation does not distinguish them, the TCOLE label does.",
  }),
  "State of Texas": Object.freeze({
    category: null,
    requiresPerAgencyReview: true,
    why: "Mixed. CSLLEA counts exactly one 'primary state' agency per state — in Texas, the Department of Public Safety — and treats every other state-level enforcement body as special jurisdiction. One TCOLE type therefore maps to two BJS categories and must be resolved per agency. See PRIMARY_STATE_AGENCY.",
  }),
  "States other than Tx": Object.freeze({
    category: BJS_CATEGORY.OUT_OF_STATE,
    why: "An out-of-state employer that appears in the TCOLE roster because a Texas licensee works there. Not a Texas agency and not part of any Texas count.",
  }),
  "U.S. Government": Object.freeze({
    category: BJS_CATEGORY.FEDERAL,
    why: "Federal. CSLLEA enumerates state and local agencies only, so these are in neither the numerator nor the denominator.",
  }),
  "U.S. Territory": Object.freeze({
    category: BJS_CATEGORY.OUT_OF_STATE,
    why: "Outside the 50 states and DC that the per-state denominators cover.",
  }),
  "Tribal Police": Object.freeze({
    category: BJS_CATEGORY.TRIBAL,
    why: "CSLLEA 2018 counts 217 tribal police departments as a separate type outside general-purpose; denominators.js records the same exclusion on the denominator side.",
  }),

  // --- Special jurisdiction: real law enforcement, limited jurisdiction. ---
  ISD: Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Independent school district police department. CSLLEA's special-jurisdiction 'public school district' type.",
  }),
  "Charter School": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Same special-jurisdiction school category as an ISD department.",
  }),
  College: Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Public university or community college police. CSLLEA special-jurisdiction campus category.",
  }),
  "Private College (CCP 2.12(8))": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Private campus police commissioned under CCP art. 2.12(8). CSLLEA includes private campus agencies in special jurisdiction.",
  }),
  "Fire Marshal": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Fire marshal and arson investigation units employ commissioned peace officers and are a named CSLLEA special-jurisdiction type. The TCOLE row is the investigative unit, not the fire department's suppression staff.",
  }),
  "Airport (CCP 2.12 (11) & (12))": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Airport police. CSLLEA special-jurisdiction transportation category.",
  }),
  "Port Authority": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Port police. CSLLEA special-jurisdiction transportation category.",
  }),
  "Metro Transit Authority (CCP 2.12 (21))": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Transit police. CSLLEA special-jurisdiction transportation category.",
  }),
  "Railroad (CCP 2.121)": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Railroad police commissioned under CCP art. 2.121. CSLLEA special-jurisdiction transportation category.",
  }),
  "Water District": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Water-district police. CSLLEA special-jurisdiction 'natural resources / conservation' category.",
  }),
  "County Park Ranger": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Park police. CSLLEA special-jurisdiction parks and recreation category.",
  }),
  Hospital: Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "Hospital-district police. CSLLEA special-jurisdiction medical-facility category.",
  }),
  "Emergency Services District": Object.freeze({
    category: BJS_CATEGORY.SPECIAL_JURISDICTION,
    why: "A Texas emergency services district with commissioned officers. Closest CSLLEA fit is special jurisdiction; it is a Texas-specific entity with no exact CSLLEA type, and that imprecision is recorded rather than hidden.",
  }),

  // --- Employs peace officers, but CSLLEA does not enumerate it. ---
  "District Attorney (CCP 2.12 (5))": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Prosecutor's office investigators. BJS covers these in the National Survey of Prosecutors, not CSLLEA; counting them against a CSLLEA denominator mixes two censuses.",
  }),
  "County Attorney (CCP 2.12 (5))": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Prosecutor's office investigators. Same exclusion as a district attorney's office.",
  }),
  Probation: Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Community supervision and corrections department. BJS covers probation in its corrections collections, not CSLLEA.",
  }),
  Parole: Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Parole supervision. BJS corrections collections, not CSLLEA.",
  }),
  "District Court": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Court bailiffs and investigators. Not an agency type CSLLEA enumerates.",
  }),
  "County Court": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "Court bailiffs and investigators. Not an agency type CSLLEA enumerates.",
  }),
  "Contract Jail": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A jail operated under contract, employing licensed jailers. BJS counts jails in the Census of Jails, not CSLLEA.",
  }),
  "Intercounty Cooperative Jail Facility": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A shared jail facility. Same exclusion as a contract jail.",
  }),
  "911 Center": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A communications centre. It appears in the TCOLE roster because TCOLE licenses telecommunicators, which is precisely the mechanism by which an officer-licensing roster stops being an agency roster.",
  }),
  "Texas Jail Commission": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A state regulatory commission, not a law enforcement agency.",
  }),
  Academy: Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A training academy, not an employing law enforcement agency.",
  }),
  "Academic Providers": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "A training provider, not a law enforcement agency.",
  }),
  "Other Agreement": Object.freeze({
    category: BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE,
    why: "TCOLE's residual label for an entity holding officers under an interlocal agreement. The source itself does not say what kind of entity it is, so it cannot be placed in a CSLLEA category.",
  }),
  UNKNOWN: Object.freeze({
    category: BJS_CATEGORY.UNCLASSIFIED,
    why: "TCOLE recorded no type. A source that says 'unknown' is still a source saying it does not know, and that is reported as a gap rather than resolved by us.",
  }),
});

/**
 * CSLLEA counts one primary state agency per state. Which one is a definitional
 * fact about the denominator, not a judgement about our data, so it is recorded
 * here with its reason and keyed by the state the denominator belongs to.
 *
 * Everything else TCOLE labels "State of Texas" — the Alcoholic Beverage
 * Commission, Parks & Wildlife, the Lottery Commission's investigators, several
 * inspectors general — is a state agency with limited enforcement jurisdiction,
 * which is CSLLEA's definition of special jurisdiction.
 */
export const PRIMARY_STATE_AGENCY = Object.freeze({
  TX: Object.freeze({
    name: "Texas Department of Public Safety",
    why: "DPS is the Texas state police agency: statewide general enforcement and traffic patrol authority, which is what CSLLEA's 'primary state' category means. The other state-level bodies in the TCOLE roster enforce within a subject-matter jurisdiction and are special jurisdiction.",
  }),
});

/**
 * Resolve a TCOLE DEPARTMENT_TYPE to a BJS category.
 *
 * Throws on an unrecognised type. That is the point: a silent "other" bucket
 * would let a future TCOLE production move a published percentage with nobody
 * noticing.
 *
 * @param {string} departmentType  verbatim DEPARTMENT_TYPE from the source
 * @param {{ state?: string, agencyName?: string }} [context]
 */
export const classifyTcoleDepartmentType = (departmentType, context = {}) => {
  const entry = TCOLE_DEPARTMENT_TYPE_MAP[departmentType];
  if (entry === undefined) {
    throw new UnknownSourceTypeError(
      `TCOLE DEPARTMENT_TYPE "${departmentType}" is not in TCOLE_DEPARTMENT_TYPE_MAP. ` +
        `Add it with a BJS category and a rationale — it must not be bucketed by default, ` +
        `because an unmapped type silently changes a published coverage percentage.`,
    );
  }

  if (entry.requiresPerAgencyReview) {
    const primary = PRIMARY_STATE_AGENCY[context.state ?? ""];
    const isPrimary =
      primary !== undefined &&
      normalizeAgencyName(primary.name) ===
        normalizeAgencyName(context.agencyName ?? "");
    return Object.freeze({
      category: isPrimary
        ? BJS_CATEGORY.PRIMARY_STATE
        : BJS_CATEGORY.SPECIAL_JURISDICTION,
      why: isPrimary ? primary.why : entry.why,
      resolvedPerAgency: true,
    });
  }

  return Object.freeze({
    category: entry.category,
    why: entry.why,
    resolvedPerAgency: false,
  });
};

/**
 * Name normalisation used to join a held agency back to its source row.
 *
 * This exists because `public.agency` carries no source key — the TCOLE
 * transform drops DEPARTMENT_NUMBER — so the only available join is on the
 * name, which the loader copies verbatim from DEPARTMENT_NAME. That makes the
 * join exact rather than fuzzy, but it is still a join on a non-key and it is
 * recorded as such in every classification's `joinedOn`.
 *
 * Punctuation and case are stripped because "Anderson Co. Sheriff's Office"
 * and "Anderson Co Sheriffs Office" are the same string with different typing.
 * Apostrophes are deleted rather than turned into separators, so a possessive
 * survives being typed without one — otherwise "Sheriff's" normalises to
 * "sheriff s" and stops matching "Sheriffs". Abbreviations are deliberately
 * left alone: "Co" and "County" are different words and guessing that they
 * mean the same thing is the slide into fuzzy matching this module refuses.
 */
export const normalizeAgencyName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Validate a classification before anything counts or renders it.
 *
 * The provenance rule for this org is that a field without provenance does not
 * render. A classified agency therefore needs the source dataset, the retrieval
 * date, a source identifier, and a confidence — the same four facts every other
 * displayed field carries — plus the verbatim source value, so a reader can see
 * what we were actually told before we mapped it.
 */
export const assertClassificationPublishable = (classification) => {
  const where = classification?.agencyName
    ? `classification of "${classification.agencyName}"`
    : "classification";

  if (classification?.category === undefined) {
    throw new AgencyTypeProvenanceError(`${where} has no BJS category.`);
  }
  if (classification.category === BJS_CATEGORY.UNCLASSIFIED) {
    if (!classification.unclassifiedReason) {
      throw new AgencyTypeProvenanceError(
        `${where} is unclassified without a reason. An unclassified agency must say why no sourced type was available, because that reason is what directs acquisition work.`,
      );
    }
    return true;
  }

  const provenance = classification.provenance;
  if (!provenance) {
    throw new AgencyTypeProvenanceError(
      `${where} has a category but no provenance. A type that cannot name its source is a guess, and this module exists specifically to not ship guesses.`,
    );
  }
  for (const field of [
    "sourceDataset",
    "retrievedOn",
    "confidence",
    "sourceField",
  ]) {
    if (!provenance[field]) {
      throw new AgencyTypeProvenanceError(
        `${where} is missing provenance.${field}.`,
      );
    }
  }
  if (!provenance.recordsRequestId && !provenance.sourceUrl) {
    throw new AgencyTypeProvenanceError(
      `${where} needs provenance.recordsRequestId or provenance.sourceUrl — a retrieval date with nothing to retrieve from is not a citation.`,
    );
  }
  if (!classification.sourceType) {
    throw new AgencyTypeProvenanceError(
      `${where} does not record the verbatim source value it was mapped from. The source's vocabulary and ours are kept separate so the mapping stays auditable.`,
    );
  }
  return true;
};

/**
 * Roll a set of classifications up into the numerators the coverage report
 * needs, per state.
 *
 * Returns counts for each BJS category plus the two numerators the denominators
 * are expressed in. `unclassified` is reported, never distributed: a state with
 * unclassified agencies has an incomplete numerator and the report must say so
 * instead of dividing anyway.
 */
export const summarizeClassifications = (classifications) => {
  const byState = new Map();

  for (const classification of classifications) {
    assertClassificationPublishable(classification);
    const state = classification.state;
    if (!byState.has(state)) {
      byState.set(state, {
        code: state,
        held: 0,
        byCategory: Object.fromEntries(
          Object.values(BJS_CATEGORY).map((category) => [category, 0]),
        ),
      });
    }
    const bucket = byState.get(state);
    bucket.held += 1;
    bucket.byCategory[classification.category] += 1;
  }

  const sum = (byCategory, categories) =>
    categories.reduce((total, category) => total + byCategory[category], 0);

  return Object.freeze(
    [...byState.values()]
      .sort((a, b) => b.held - a.held || a.code.localeCompare(b.code))
      .map((bucket) =>
        Object.freeze({
          code: bucket.code,
          held: bucket.held,
          byCategory: Object.freeze(bucket.byCategory),
          generalPurposeHeld: sum(
            bucket.byCategory,
            GENERAL_PURPOSE_CATEGORIES,
          ),
          allAgencyHeld: sum(bucket.byCategory, ALL_AGENCY_CATEGORIES),
          unclassifiedHeld: bucket.byCategory[BJS_CATEGORY.UNCLASSIFIED],
          /**
           * A numerator is only usable when every held row in the state got a
           * sourced type. One unclassified row means the general-purpose count
           * is a floor, not a count, and the report renders it as such.
           */
          numeratorComplete: bucket.byCategory[BJS_CATEGORY.UNCLASSIFIED] === 0,
        }),
      ),
  );
};
