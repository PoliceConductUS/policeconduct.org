/**
 * ---------------------------------------------------------------------------
 * Coverage report v1 (INS-7).
 *
 * Composes what we hold (`held-counts.js`) against what exists
 * (`denominators.js`) and renders the result.
 *
 * The anti-goal for this issue is "a dashboard that flatters us", so the
 * composition rule is: a percentage is the exception and a named gap is the
 * default. Specifically —
 *
 *   - A percentage requires knowing which of the agencies we hold are in the
 *     denominator's universe. Our sources are state licensing and employment
 *     records, which enumerate employers of licensed officers rather than
 *     agencies of a given type, so for most of the corpus we still do not know.
 *     Where a count fits inside a denominator but its universe is unverified we
 *     report a ceiling ("no more than N%"), which cannot overstate what we have.
 *
 *     INS-79 changed this for part of the corpus: a state whose every agency
 *     carries a type taken from a source (`agency-types.js`) gets a numerator
 *     drawn from the same population as the denominator, and that earns an
 *     achieved percentage. The fallback is unchanged everywhere else, and the
 *     threshold is strict — one unclassified agency in a state and the whole
 *     state goes back to a ceiling.
 *
 *   - Where we hold more agencies than the denominator counts, that is a
 *     universe mismatch and it is reported as one. It is never coverage of more
 *     than 100%, and it is never quietly clamped.
 *
 *   - A state we hold nothing in is a finding with a name, not a 0% row to be
 *     averaged into a national figure.
 * ---------------------------------------------------------------------------
 */

import {
  AUDIENCE,
  DEFINITIONAL_CONFLICTS,
  DENOMINATOR_LINEAGE,
  GAP_KIND,
  PRIMARY_NATIONAL_DENOMINATOR_ID,
  SECONDARY_NATIONAL_DENOMINATOR_ID,
  UNIVERSE,
  formatCoverage,
  formatCoverageCeiling,
  formatDenominator,
  getDenominator,
  getStateDenominator,
  listStateDenominatorCodes,
  nationalCoverage,
} from "./denominators.js";
import { BJS_CATEGORY } from "./agency-types.js";
import {
  SOURCE_OF_RECORD,
  STORE_STATUS,
  classifyCrossCheck,
} from "./authoritative-store.js";

/**
 * Why we cannot turn a held count into a coverage percentage. Attached to the
 * report as a whole, because it applies to every row in it.
 */
const numeratorUniverseGap = ({ unclassifiedHeld, unclassifiedStates }) => {
  if (unclassifiedHeld === 0) {
    return null;
  }
  const where = unclassifiedStates.join(", ");
  return Object.freeze({
    kind: GAP_KIND.NUMERATOR_UNIVERSE_UNVERIFIED,
    scope: "national",
    detail:
      `${unclassifiedHeld.toLocaleString("en-US")} held agencies, in ${where}, carry no sourced agency type, so they cannot be placed in the BJS universes the denominators are drawn from. ` +
      "These states' sources enumerate entities that employ licensed peace officers without saying what kind of entity each one is: MN POST's productions key agencies by name only and publish no type column, and the Oregon records have no registered intake source at all. " +
      "No percentage is reported for these jurisdictions or for the national total; ceilings are reported instead. States whose agencies all carry a sourced type are not affected and do report achieved coverage.",
    unblockedBy:
      "Obtain a per-agency type for these states — a state roster that publishes one, or an authoritative national roster with types (INS-31). Name matching is not a substitute: it was tested on INS-79 and, beyond leaving most records unclassified, an unconstrained name join silently gave 22 Minnesota and Oregon agencies a Texas classification.",
  });
};

/**
 * Classify every cross-checked count against the single source of record.
 *
 * There is only one source (board ruling, 2026-10-25), so this is not an
 * arbitration between rival stores. An abandoned artifact's count is simply not
 * a count of record; what still deserves a finding is a *derived* count that
 * disagrees with the store it is derived from, or a store nobody can identify.
 */
const classifyCrossChecks = (crossChecks, measurement) =>
  crossChecks
    .filter((check) => Number.isInteger(check.count))
    .map((check) =>
      Object.freeze({ ...check, ...classifyCrossCheck(check, measurement) }),
    );

/** Statuses that are findings rather than explanations. */
const IS_FINDING = Object.freeze([
  STORE_STATUS.UNRECORDED,
  STORE_STATUS.DERIVED_DRIFTED,
]);

/**
 * A count we cannot account for against the source of record. Either a store we
 * cannot identify, or a projection that has drifted from the store it projects.
 */
const disputedCountGap = (classified, measuredTotal) => {
  const findings = classified.filter((check) =>
    IS_FINDING.includes(check.status),
  );
  if (findings.length === 0) {
    return null;
  }
  const detail = findings
    .map((check) => {
      const head = `${check.store} reports ${check.count.toLocaleString("en-US")}`;
      return check.detail
        ? check.detail
        : `${head}, and we cannot say what store that is.`;
    })
    .join(" ");
  return Object.freeze({
    kind: GAP_KIND.CORPUS_COUNT_DISPUTED,
    scope: "national",
    detail: `${SOURCE_OF_RECORD.label} holds ${measuredTotal.toLocaleString("en-US")} agencies and is the single source of record, so that count stands. ${detail}`,
    unblockedBy: `Identify the store and either record it in NON_SOURCE_STORES with what it is, or correct the cross-checked figure. If a projection has drifted, re-run scripts/refresh-build-projections.mjs against ${SOURCE_OF_RECORD.label}.`,
  });
};

/**
 * The report measured a store that is not the authoritative one. Its counts are
 * still true of that store, which is why this is a named gap rather than a
 * thrown error — but none of them may be quoted as the corpus count.
 */
const storeAuthorityGap = (authority) => {
  if (!authority || authority.isAuthoritative) {
    return null;
  }
  const reasons = [];
  if (authority.missing.length > 0) {
    reasons.push(`it is missing ${authority.missing.join(", ")}`);
  }
  if (authority.unexpected.length > 0) {
    reasons.push(
      `it carries the pre-rename ${authority.unexpected.join(", ")}, which only the legacy corpus has`,
    );
  }
  return Object.freeze({
    kind: GAP_KIND.MEASURED_STORE_NOT_AUTHORITATIVE,
    scope: "national",
    detail: `This report did not measure ${SOURCE_OF_RECORD.label}, the single source of record for agency counts: ${reasons.join("; ")}. Every count below is true of the store identified above and of no other, and none of them is the corpus count.`,
    unblockedBy: `Point DATABASE_URL at ${SOURCE_OF_RECORD.label} and re-run. The designation and the evidence for it are in docs/0007-authoritative-agency-store.md.`,
  });
};

/**
 * Always cites the all-agency denominator, the broadest count of what exists in
 * the jurisdiction, so the size of the gap is not understated.
 */
const noRecordsGap = (code) => {
  const denominator =
    getStateDenominator(code, UNIVERSE.ALL_AGENCY) ??
    getStateDenominator(code, UNIVERSE.GENERAL_PURPOSE);
  return Object.freeze({
    kind: GAP_KIND.NO_RECORDS_HELD,
    scope: code,
    detail: `No agency records held in ${code}, against ${formatDenominator(denominator, { audience: AUDIENCE.INTERNAL })}. This is a complete gap, not a low coverage figure.`,
    unblockedBy: `Identify a lawfully ingestible source of agency records for ${code}. The state POST commission access survey (INS-12) is the input that tells us whether one exists.`,
  });
};

/**
 * Reads one state in one universe: achieved coverage, a ceiling, or a gap.
 *
 * `held` is every agency record we have in the state. `numerator` is the subset
 * that a sourced agency type places inside *this* universe — the distinction
 * INS-79 existed to create. When the numerator is known the reading is an
 * achieved percentage; when it is not, the reading falls back to a ceiling
 * computed from the raw held count, which is what this report did everywhere
 * before types were sourced.
 *
 * @param {{ numerator: number|null }} args.classified  null when the state has
 *   any agency without a sourced type. One unclassified row is enough: a
 *   numerator that is missing an unknown number of members is a floor, and a
 *   floor divided by a denominator is not coverage.
 */
const readState = ({ code, held, universe, asOfYear, classified = null }) => {
  const denominator = getStateDenominator(code, universe);

  // Zero held is a complete gap. A "≤ 0.0%" ceiling would be arithmetically
  // true and editorially useless — it reads like a measurement of a thin
  // corpus rather than the absence of one.
  if (held === 0 && denominator) {
    return {
      universe,
      denominator,
      coverage: null,
      ceiling: null,
      gap: noRecordsGap(code),
    };
  }

  if (!denominator) {
    return {
      universe,
      denominator: null,
      coverage: null,
      ceiling: null,
      gap: Object.freeze({
        kind: GAP_KIND.NO_STATE_DENOMINATOR,
        scope: code,
        detail: `${held.toLocaleString("en-US")} agencies held in ${code}, which is not a state or territory we hold a ${universe} denominator for. A national denominator is not apportioned to produce one.`,
        unblockedBy:
          "Load a published per-state count for this jurisdiction, or record that the jurisdiction is outside the denominator's scope.",
      }),
    };
  }

  // The count this universe is actually about: the classified subset when we
  // have one, otherwise everything we hold in the state.
  const numerator = classified === null ? held : classified;
  const isClassified = classified !== null;

  if (numerator > denominator.value) {
    return {
      universe,
      denominator,
      coverage: null,
      ceiling: null,
      gap: Object.freeze({
        kind: GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
        scope: code,
        denominatorId: denominator.id,
        detail: isClassified
          ? `${numerator.toLocaleString("en-US")} of the ${held.toLocaleString("en-US")} agencies held in ${code} carry a sourced type placing them in this universe, against ${formatDenominator(denominator, { audience: AUDIENCE.INTERNAL })}. The numerator is now the right population and still exceeds the denominator, so this is no longer an unexplained universe mismatch — it is a residual difference between our count and a 2018 enumeration, and no percentage is reported.`
          : `${held.toLocaleString("en-US")} agencies held in ${code} against ${formatDenominator(denominator, { audience: AUDIENCE.INTERNAL })}. Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.`,
        unblockedBy: isClassified
          ? "Two untested causes remain, both on the denominator's side: BJS excludes agencies employing less than one full-time-equivalent sworn officer, and the enumeration is from 2018. Neither can be applied to our numerator without a sworn-headcount field BJS would recognise."
          : "Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.",
      }),
    };
  }

  // A sourced numerator is the whole point: it earns an achieved percentage
  // rather than a ceiling.
  if (isClassified) {
    return {
      universe,
      denominator,
      coverage: formatCoverage({
        held: numerator,
        denominator,
        asOfYear,
        audience: AUDIENCE.INTERNAL,
      }),
      ceiling: null,
      gap: null,
    };
  }

  return {
    universe,
    denominator,
    coverage: null,
    ceiling: formatCoverageCeiling({
      held,
      denominator,
      asOfYear,
      audience: AUDIENCE.INTERNAL,
    }),
    gap: null,
  };
};

/**
 * @param {{
 *   measurement: Awaited<ReturnType<typeof import("./held-counts.js").measureHeldAgencies>>,
 *   asOf?: Date,
 *   corpusCrossChecks?: { store: string, count: number, note?: string }[],
 * }} args
 */
export const buildCoverageReport = ({
  measurement,
  asOf = new Date(),
  corpusCrossChecks = [],
  classification = [],
}) => {
  const asOfYear = asOf.getUTCFullYear();
  const heldByCode = new Map(
    measurement.byState.map((row) => [row.code, row.held]),
  );
  // Only a state whose every held agency carries a sourced type contributes a
  // numerator. `numeratorComplete` is computed in agency-types.js and is false
  // the moment one row is unclassified.
  const classifiedByCode = new Map(
    classification
      .filter((row) => row.numeratorComplete)
      .map((row) => [row.code, row]),
  );

  const denominatorCodes = listStateDenominatorCodes();
  const heldCodes = [...heldByCode.keys()];
  // Every jurisdiction that appears on either side, so a state we hold records
  // in but have no denominator for cannot fall out of the report unseen.
  const allCodes = [...new Set([...denominatorCodes, ...heldCodes])].sort();

  const states = allCodes.map((code) => {
    const held = heldByCode.get(code) ?? 0;
    const classified = classifiedByCode.get(code) ?? null;
    const generalPurpose = readState({
      code,
      held,
      universe: UNIVERSE.GENERAL_PURPOSE,
      asOfYear,
      classified: classified ? classified.generalPurposeHeld : null,
    });
    const allAgency = readState({
      code,
      held,
      universe: UNIVERSE.ALL_AGENCY,
      asOfYear,
      classified: classified ? classified.allAgencyHeld : null,
    });

    // Both universes can raise the same finding for one state — a state we hold
    // nothing in is not two separate gaps. Keyed by kind so it is reported once,
    // while a kind that genuinely differs per universe is kept per universe.
    const gaps = [];
    const seenKinds = new Set();
    for (const reading of [generalPurpose, allAgency]) {
      if (!reading.gap) {
        continue;
      }
      const key =
        reading.gap.kind === GAP_KIND.NO_RECORDS_HELD
          ? reading.gap.kind
          : `${reading.gap.kind}:${reading.universe}`;
      if (seenKinds.has(key)) {
        continue;
      }
      seenKinds.add(key);
      gaps.push(reading.gap);
    }

    return Object.freeze({
      code,
      held,
      generalPurpose: Object.freeze(generalPurpose),
      allAgency: Object.freeze(allAgency),
      gaps: Object.freeze(gaps),
    });
  });

  const primary = getDenominator(PRIMARY_NATIONAL_DENOMINATOR_ID);
  const secondary = getDenominator(SECONDARY_NATIONAL_DENOMINATOR_ID);

  // Harvested for its staleness and citation gap logic; its percentages are
  // deliberately discarded in favour of ceilings.
  // Both national denominators come from the same publication, so the staleness
  // gap is raised twice with identical wording. One finding, reported once.
  const nationalGaps = [
    ...new Map(
      nationalCoverage({
        heldGeneralPurpose: measurement.totalHeld,
        heldAllAgency: measurement.totalHeld,
        asOfYear,
        audience: AUDIENCE.INTERNAL,
      }).gaps.map((gap) => [`${gap.kind}:${gap.detail}`, gap]),
    ).values(),
  ];

  const nationalCeiling = (denominator) =>
    measurement.totalHeld > denominator.value
      ? null
      : formatCoverageCeiling({
          held: measurement.totalHeld,
          denominator,
          asOfYear,
          audience: AUDIENCE.INTERNAL,
        });

  // Every held agency that no source could type, and where it is. Computed
  // from the measurement rather than from the classification so that a state
  // the classifier never saw counts as unclassified rather than vanishing.
  const unclassifiedByCode = new Map(
    classification.map((row) => [row.code, row.unclassifiedHeld]),
  );
  const unclassifiedStates = states
    .filter(
      (state) =>
        state.held > 0 &&
        (unclassifiedByCode.get(state.code) ?? state.held) > 0,
    )
    .map((state) => state.code);
  const unclassifiedHeld = unclassifiedStates.reduce(
    (total, code) =>
      total + (unclassifiedByCode.get(code) ?? heldByCode.get(code) ?? 0),
    0,
  );

  const reportGaps = [];
  const universeGap = numeratorUniverseGap({
    unclassifiedHeld,
    unclassifiedStates,
  });
  if (universeGap) {
    reportGaps.push(universeGap);
  }
  // Whether the right store was measured comes before any finding about how a
  // count presented to the report relates to it.
  const notAuthoritative = storeAuthorityGap(measurement.storeAuthority);
  if (notAuthoritative) {
    reportGaps.push(notAuthoritative);
  }
  const classifiedCrossChecks = classifyCrossChecks(
    corpusCrossChecks,
    measurement,
  );
  const disputed = disputedCountGap(
    classifiedCrossChecks,
    measurement.totalHeld,
  );
  if (disputed) {
    reportGaps.push(disputed);
  }

  const statesWithRecords = states.filter((state) => state.held > 0);
  const statesWithoutRecords = states.filter(
    (state) => state.held === 0 && state.allAgency.denominator,
  );

  return Object.freeze({
    asOf: asOf.toISOString(),
    asOfYear,
    measurement,
    sourceOfRecord: SOURCE_OF_RECORD,
    corpusCrossChecks: Object.freeze(classifiedCrossChecks),
    national: Object.freeze({
      held: measurement.totalHeld,
      primary: Object.freeze({
        denominator: primary,
        ceiling: nationalCeiling(primary),
      }),
      secondary: Object.freeze({
        denominator: secondary,
        ceiling: nationalCeiling(secondary),
      }),
      gaps: Object.freeze(nationalGaps),
    }),
    states: Object.freeze(states),
    classification: Object.freeze(classification),
    summary: Object.freeze({
      jurisdictionsWithRecords: statesWithRecords.length,
      jurisdictionsWithoutRecords: statesWithoutRecords.length,
      jurisdictionsWithDenominator: denominatorCodes.length,
      universeMismatches: states.filter((state) =>
        state.gaps.some(
          (gap) => gap.kind === GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
        ),
      ).length,
      /**
       * Was zero for the life of this report, by design, because no numerator
       * could be placed in a denominator's universe. INS-79 made some of them
       * placeable; this counts how many, so a regression back to zero — or a
       * jump that outruns the classification — is visible in the JSON.
       */
      achievedPercentagesReported: states.reduce(
        (total, state) =>
          total +
          (state.generalPurpose.coverage ? 1 : 0) +
          (state.allAgency.coverage ? 1 : 0),
        0,
      ),
      jurisdictionsFullyClassified: classifiedByCode.size,
      unclassifiedHeld,
    }),
    gaps: Object.freeze(reportGaps),
    lineage: DENOMINATOR_LINEAGE,
    conflicts: DEFINITIONAL_CONFLICTS,
  });
};

const GAP_LABEL = Object.freeze({
  [GAP_KIND.NO_STATE_DENOMINATOR]: "no state denominator",
  [GAP_KIND.HELD_NOT_IN_ROSTER]: "held, not in roster",
  [GAP_KIND.IN_ROSTER_NOT_HELD]: "in roster, not held",
  [GAP_KIND.NO_USABLE_SOURCE]: "no usable source",
  [GAP_KIND.DENOMINATOR_STALE]: "denominator stale",
  [GAP_KIND.CITATION_UNCONFIRMED]: "citation unconfirmed",
  [GAP_KIND.HELD_EXCEEDS_DENOMINATOR]: "universe mismatch",
  [GAP_KIND.NO_RECORDS_HELD]: "nothing held",
  [GAP_KIND.NUMERATOR_UNIVERSE_UNVERIFIED]: "numerator universe unverified",
  [GAP_KIND.CORPUS_COUNT_DISPUTED]: "corpus count disputed",
  [GAP_KIND.MEASURED_STORE_NOT_AUTHORITATIVE]: "store not authoritative",
});

const num = (value) =>
  Number.isInteger(value) ? value.toLocaleString("en-US") : "—";

const renderPercent = (percent) =>
  percent >= 10 ? percent.toFixed(0) : percent.toFixed(1);

/**
 * The state's one-line reading: achieved coverage, a ceiling, or the name of
 * the gap.
 *
 * An achieved percentage is marked with a bold `=` and a ceiling with `≤`, so
 * the two can never be mistaken for each other at a glance in a table. The
 * whole report was ceilings until INS-79; a reader who skims it after the
 * change must be able to see which rows moved.
 */
const stateReading = (reading) => {
  if (reading.gap) {
    return GAP_LABEL[reading.gap.kind];
  }
  if (reading.coverage) {
    return `**= ${renderPercent(reading.coverage.percent)}%**`;
  }
  if (!reading.ceiling) {
    return "—";
  }
  return `≤ ${renderPercent(reading.ceiling.percent)}%`;
};

export const renderCoverageReportMarkdown = (report) => {
  const lines = [];
  const push = (line = "") => lines.push(line);

  push("# Agency coverage report v1");
  push();
  push(
    `Generated ${report.asOf} from database \`${report.measurement.database.database}\`,` +
      ` dialled at ${report.measurement.database.connectedTo ?? "an unrecorded address"}` +
      ` (server reports itself as ${report.measurement.database.host}:${report.measurement.database.port}).`,
  );
  push();
  const authority = report.measurement.storeAuthority;
  if (authority?.isAuthoritative) {
    push(
      `That store is **${report.sourceOfRecord.label}**, the single source of record for` +
        " agency counts, verified here by schema signature rather than by address. Intake is" +
        " the only path that populates it, so the counts below are this organisation's agency" +
        " counts rather than one store's opinion of them — there is no second store to" +
        " reconcile against. See `docs/0007-authoritative-agency-store.md`.",
    );
  } else {
    push(
      `**This is not ${report.sourceOfRecord.label}**, the single source of record for agency` +
        " counts. Read the address above before quoting any number here: this report asserts" +
        " only what the store it measured contains, and that store is not the one our corpus" +
        " count comes from. See *store not authoritative* below.",
    );
  }
  push();
  const achieved = report.summary.achievedPercentagesReported;
  if (achieved === 0) {
    push(
      "**This report contains no achieved coverage percentage.** Not one. The reason is in" +
        " *Why there are no percentages* below, and it is the most important finding here.",
    );
  } else {
    push(
      `**This report contains ${achieved} achieved coverage ${achieved === 1 ? "percentage" : "percentages"},` +
        ` covering ${num(report.summary.jurisdictionsFullyClassified)} of the` +
        ` ${num(report.summary.jurisdictionsWithRecords)} jurisdictions we hold records in.** Every other` +
        " reading is still a ceiling or a named gap. A percentage appears only where every agency" +
        " we hold in that state carries an agency type taken from a source, so the numerator and the" +
        " denominator describe the same population; see *Where percentages come from* below." +
        ` The remaining ${num(report.summary.unclassifiedHeld)} held agencies have no sourced type.`,
    );
  }
  push();

  push("## What we hold");
  push();
  push(
    `- Agency records in the measured store: **${num(report.national.held)}**`,
  );
  if (Number.isInteger(report.measurement.publishedAsPages)) {
    push(
      `- Of those, rendering as public agency pages: **${num(report.measurement.publishedAsPages)}** (held is not the same as published)`,
    );
  }
  if (Number.isInteger(report.measurement.federalHeld)) {
    push(
      `- Federal agency records included in that total: **${num(report.measurement.federalHeld)}** (the BJS denominators count state and local agencies only)`,
    );
  }
  push(
    `- Jurisdictions with at least one record: **${report.summary.jurisdictionsWithRecords}**`,
  );
  push(
    `- Jurisdictions with a denominator and zero records: **${report.summary.jurisdictionsWithoutRecords}**`,
  );
  push(
    `- Jurisdictions where we hold more than the denominator counts: **${report.summary.universeMismatches}**`,
  );
  push();
  push(
    `Corpus fingerprint: ${num(report.measurement.fingerprint.rows)} rows, newest \`updated_at\` ${report.measurement.fingerprint.newest_updated_at ?? "unknown"}. Quote these counts only with this fingerprint attached — the development database is shared and is reset without notice.`,
  );
  push();

  push("## The denominators");
  push();
  push(
    `- Primary (headline): ${formatDenominator(report.national.primary.denominator, { audience: AUDIENCE.INTERNAL })}`,
  );
  push(
    `- Reported alongside, never instead of: ${formatDenominator(report.national.secondary.denominator, { audience: AUDIENCE.INTERNAL })}`,
  );
  push();
  for (const ceiling of [
    report.national.primary.ceiling,
    report.national.secondary.ceiling,
  ]) {
    if (ceiling) {
      push(`- National ceiling: ${ceiling.sentence}`);
    }
  }
  if (!report.national.primary.ceiling) {
    push(
      "- National ceiling against the primary denominator: **not reportable** — see the universe mismatch gaps.",
    );
  }
  push();
  if (report.summary.universeMismatches > 0) {
    push(
      `Read the national ceilings with this in mind: in ${report.summary.universeMismatches} of the` +
        ` ${report.summary.jurisdictionsWithRecords} jurisdictions we hold records in, we hold more` +
        " agencies than that state's own denominator counts. Those records are inside the national" +
        " numerator, so the ceilings above are inflated by an unknown number of rows that are not in" +
        " the denominator's universe at all. The ceilings are still ceilings — they cannot overstate" +
        " what we have achieved — but they are looser than they look.",
    );
    push();
  }

  push(
    report.summary.achievedPercentagesReported === 0
      ? "## Why there are no percentages"
      : "## Where percentages come from, and why most readings still are not one",
  );
  push();
  for (const gap of report.gaps) {
    push(`### ${GAP_LABEL[gap.kind]}`);
    push();
    push(gap.detail);
    push();
    push(`*Unblocked by:* ${gap.unblockedBy}`);
    push();
  }

  const classified = report.classification.filter((row) => row.held > 0);
  if (classified.length > 0) {
    push("## What kind of agencies we hold");
    push();
    push(
      "Agency type comes from the source's own classification of the entity, never from its" +
        " name. Where no source publishes a type, the agencies are `untyped` and the state" +
        " reports a ceiling rather than a percentage — `untyped` is a gap, not a category.",
    );
    push();
    push(
      "The three leftmost count columns sum to the general-purpose numerator. `constable /" +
        " marshal` and `special jurisdiction` are law enforcement agencies that BJS counts in" +
        " the all-agency total but not in general-purpose. `outside the census` are entities" +
        " that employ licensed peace officers — prosecutors' investigators, probation and" +
        " parole, courts, jails, 911 centres — which the BJS census does not enumerate at all," +
        " so they belong in neither numerator and are the reason a licensing roster is not an" +
        " agency roster.",
    );
    push();
    push(
      "| state | held | local police | sheriff | primary state | **general-purpose** | constable / marshal | special jurisdiction | **all-agency** | outside the census | federal | tribal | untyped |",
    );
    push(
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const row of classified) {
      const cell = (category) => num(row.byCategory[category]);
      push(
        `| ${row.code} | ${num(row.held)} ` +
          `| ${cell(BJS_CATEGORY.LOCAL_POLICE)} ` +
          `| ${cell(BJS_CATEGORY.SHERIFF)} ` +
          `| ${cell(BJS_CATEGORY.PRIMARY_STATE)} ` +
          `| **${num(row.generalPurposeHeld)}** ` +
          `| ${cell(BJS_CATEGORY.CONSTABLE_MARSHAL)} ` +
          `| ${cell(BJS_CATEGORY.SPECIAL_JURISDICTION)} ` +
          `| **${num(row.allAgencyHeld)}** ` +
          `| ${cell(BJS_CATEGORY.NOT_IN_CSLLEA_UNIVERSE)} ` +
          `| ${cell(BJS_CATEGORY.FEDERAL)} ` +
          `| ${cell(BJS_CATEGORY.TRIBAL)} ` +
          `| ${num(row.unclassifiedHeld)} |`,
      );
    }
    push();
    push(
      "Read the Texas row against that state's denominators — 1,041 general-purpose and 1,935" +
        " all-agency. The corpus looked like 2.8x the state's general-purpose count because" +
        " most of it was never general-purpose: Texas elects a constable per justice-of-the-peace" +
        " precinct, and the licensing roster additionally carries school district, campus, fire" +
        " marshal, hospital and water district agencies plus several hundred entities the census" +
        " does not count. Decomposed, the general-purpose figure lands within a few percent of" +
        " the published denominator.",
    );
    push();
  }

  push("## By state");
  push();
  push(
    "`held` is agency records in the measured store. The two denominator columns are that" +
      " state's own published counts — never a share of the national figure. A reading of" +
      " **`= N%`** is achieved coverage: every agency held in that state carries a sourced type," +
      " so the numerator counts only agencies in that denominator's universe. A reading of" +
      " `≤ N%` is a ceiling, not a measurement. Anything else is the name of a gap.",
  );
  push();
  push(
    "A high ceiling is not near-complete coverage. `≤ 94%` means only that we hold enough" +
      " records that coverage *could* be as high as 94% if every one of them were in that" +
      " universe and matched a distinct agency in it — neither of which is established. Where" +
      " the same state reads `universe mismatch` in the other column, we already know the count" +
      " includes records outside at least one of these universes.",
  );
  push();
  push(
    "| state | held | general-purpose denom. | all-agency denom. | general-purpose reading | all-agency reading |",
  );
  push("| --- | ---: | ---: | ---: | --- | --- |");
  for (const state of report.states) {
    push(
      `| ${state.code} | ${num(state.held)} | ${num(state.generalPurpose.denominator?.value)} | ${num(state.allAgency.denominator?.value)} | ${stateReading(state.generalPurpose)} | ${stateReading(state.allAgency)} |`,
    );
  }
  push();
  push(
    `All state denominators: ${report.national.primary.denominator.source}, ${report.national.primary.denominator.year}, table 3. The per-state values are survey estimates carrying standard errors, not exact enumerations.`,
  );
  push();

  push("## Named gaps by state");
  push();
  const withGaps = report.states.filter((state) => state.gaps.length > 0);
  const nothingHeld = withGaps.filter((state) =>
    state.gaps.some((gap) => gap.kind === GAP_KIND.NO_RECORDS_HELD),
  );
  const other = withGaps.filter(
    (state) => !state.gaps.some((gap) => gap.kind === GAP_KIND.NO_RECORDS_HELD),
  );

  push(`### Nothing held — ${nothingHeld.length} jurisdictions`);
  push();
  push(
    "Each of these is a complete gap and a direct input to acquisition work. Whether a" +
      " lawfully ingestible source exists for each is not yet known; that is INS-12.",
  );
  push();
  push(
    nothingHeld
      .map(
        (state) =>
          `${state.code} (${num(state.allAgency.denominator?.value)} agencies exist)`,
      )
      .join(", ") || "None.",
  );
  push();

  push("### Jurisdictions with records and an unresolved gap");
  push();
  for (const state of other) {
    push(`#### ${state.code} — ${num(state.held)} held`);
    push();
    for (const gap of state.gaps) {
      push(`- **${GAP_LABEL[gap.kind]}** — ${gap.detail}`);
      push(`  - *Unblocked by:* ${gap.unblockedBy}`);
    }
    push();
  }

  if (report.national.gaps.length > 0) {
    push("## National gaps");
    push();
    for (const gap of report.national.gaps) {
      push(`- **${GAP_LABEL[gap.kind]}** — ${gap.detail}`);
      if (gap.unblockedBy) {
        push(`  - *Unblocked by:* ${gap.unblockedBy}`);
      }
    }
    push();
  }

  push("## Denominator changes");
  push();
  for (const change of report.lineage) {
    push(
      `- **${change.universe}**: \`${change.fromId}\` → \`${change.toId}\` on ${change.changedOn} (${change.issue}). ${change.reason}`,
    );
  }
  push();

  push("## Source conflicts we are carrying, not resolving");
  push();
  for (const conflict of report.conflicts) {
    push(`- **${conflict.id}** — ${conflict.detail}`);
  }
  push();

  if (report.measurement.limitations.length > 0) {
    push("## Measurement limitations");
    push();
    for (const limitation of report.measurement.limitations) {
      push(
        `- \`${limitation.missing}\` unavailable — ${limitation.consequence}`,
      );
    }
    push();
  }

  if (report.corpusCrossChecks.length > 0) {
    push("## Other counts presented to this report");
    push();
    push(
      `${report.sourceOfRecord.label} is the single source of record, so nothing below is a rival count. Each is labelled with what it actually is. A count marked _derived drifted_ or _unrecorded_ is a gap above, not a footnote.`,
    );
    push();
    for (const check of report.corpusCrossChecks) {
      push(
        `- **${check.store}**: ${num(check.count)} — ${check.status.replace(/_/g, " ")}${check.note ? ` (${check.note})` : ""}`,
      );
      if (check.detail) {
        push(`  - ${check.detail}`);
      } else if (check.storeRecord) {
        push(`  - ${check.storeRecord.note}`);
      }
    }
    push();
  }

  return `${lines.join("\n").trimEnd()}\n`;
};
