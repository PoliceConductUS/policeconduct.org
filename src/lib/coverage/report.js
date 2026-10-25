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
 *   - We do not know which of the agencies we hold are general purpose. The
 *     `agency` table has no agency-type column, and our sources are state
 *     licensing and employment records, which enumerate employers of licensed
 *     officers rather than agencies of a given type. So no achieved coverage
 *     percentage is reported at all. Where a count fits inside a denominator we
 *     report a ceiling ("no more than N%"), which cannot overstate what we have.
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
  formatCoverageCeiling,
  formatDenominator,
  getDenominator,
  getStateDenominator,
  listStateDenominatorCodes,
  nationalCoverage,
} from "./denominators.js";

/**
 * Why we cannot turn a held count into a coverage percentage. Attached to the
 * report as a whole, because it applies to every row in it.
 */
const numeratorUniverseGap = () =>
  Object.freeze({
    kind: GAP_KIND.NUMERATOR_UNIVERSE_UNVERIFIED,
    scope: "national",
    detail:
      "The agency table has no agency-type column, so we cannot classify the agencies we hold into the BJS universes the denominators are drawn from. Our sources enumerate entities that employ licensed peace officers, which is not the same population as general-purpose law enforcement agencies. No achieved coverage percentage is reported anywhere in this report; ceilings are reported instead.",
    unblockedBy:
      "Classify held agencies by BJS agency type, sourced per agency rather than inferred from the name. Name matching is not sufficient — it leaves the majority of the Texas corpus unclassified.",
  });

/**
 * Two stores we control disagree about how many agencies we hold. That is a
 * reportable finding about our own data, not a footnote.
 */
const disputedCountGap = (crossChecks, measuredTotal) => {
  const disagreeing = crossChecks.filter(
    (check) => Number.isInteger(check.count) && check.count !== measuredTotal,
  );
  if (disagreeing.length === 0) {
    return null;
  }
  const detail = disagreeing
    .map(
      (check) =>
        `${check.store} reports ${check.count.toLocaleString("en-US")}`,
    )
    .join("; ");
  return Object.freeze({
    kind: GAP_KIND.CORPUS_COUNT_DISPUTED,
    scope: "national",
    detail: `The measured store reports ${measuredTotal.toLocaleString("en-US")} agencies, but ${detail}. These are stores we control and they do not agree, so there is no single authoritative held count today. The numbers in this report are the measured store's, identified above, and are not claimed to be the production corpus.`,
    unblockedBy:
      "Establish which store is authoritative for coverage reporting and reconcile the others against it, or record why they legitimately differ.",
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
 * Reads one state in one universe: either a ceiling, or a named gap.
 */
const readState = ({ code, held, universe, asOfYear }) => {
  const denominator = getStateDenominator(code, universe);

  // Zero held is a complete gap. A "≤ 0.0%" ceiling would be arithmetically
  // true and editorially useless — it reads like a measurement of a thin
  // corpus rather than the absence of one.
  if (held === 0 && denominator) {
    return {
      universe,
      denominator,
      ceiling: null,
      gap: noRecordsGap(code),
    };
  }

  if (!denominator) {
    return {
      universe,
      denominator: null,
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

  if (held > denominator.value) {
    return {
      universe,
      denominator,
      ceiling: null,
      gap: Object.freeze({
        kind: GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
        scope: code,
        denominatorId: denominator.id,
        detail: `${held.toLocaleString("en-US")} agencies held in ${code} against ${formatDenominator(denominator, { audience: AUDIENCE.INTERNAL })}. Holding more agencies than the denominator counts is a universe mismatch, not coverage above 100%, so no percentage and no ceiling is reported.`,
        unblockedBy:
          "Reconcile the held records against the denominator's universe. Candidate explanations, none yet tested: duplicate agency rows, sub-units such as constable precincts counted as separate agencies, entities that employ licensed officers but are not law enforcement agencies, and the BJS exclusion of agencies with less than one full-time-equivalent sworn officer.",
      }),
    };
  }

  return {
    universe,
    denominator,
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
}) => {
  const asOfYear = asOf.getUTCFullYear();
  const heldByCode = new Map(
    measurement.byState.map((row) => [row.code, row.held]),
  );

  const denominatorCodes = listStateDenominatorCodes();
  const heldCodes = [...heldByCode.keys()];
  // Every jurisdiction that appears on either side, so a state we hold records
  // in but have no denominator for cannot fall out of the report unseen.
  const allCodes = [...new Set([...denominatorCodes, ...heldCodes])].sort();

  const states = allCodes.map((code) => {
    const held = heldByCode.get(code) ?? 0;
    const generalPurpose = readState({
      code,
      held,
      universe: UNIVERSE.GENERAL_PURPOSE,
      asOfYear,
    });
    const allAgency = readState({
      code,
      held,
      universe: UNIVERSE.ALL_AGENCY,
      asOfYear,
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

  const reportGaps = [numeratorUniverseGap()];
  const disputed = disputedCountGap(corpusCrossChecks, measurement.totalHeld);
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
    corpusCrossChecks: Object.freeze(corpusCrossChecks),
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
    summary: Object.freeze({
      jurisdictionsWithRecords: statesWithRecords.length,
      jurisdictionsWithoutRecords: statesWithoutRecords.length,
      jurisdictionsWithDenominator: denominatorCodes.length,
      universeMismatches: states.filter((state) =>
        state.gaps.some(
          (gap) => gap.kind === GAP_KIND.HELD_EXCEEDS_DENOMINATOR,
        ),
      ).length,
      achievedPercentagesReported: 0,
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
});

const num = (value) =>
  Number.isInteger(value) ? value.toLocaleString("en-US") : "—";

/** The state's one-line reading: a ceiling, or the name of the gap. */
const stateReading = (reading) => {
  if (reading.gap) {
    return GAP_LABEL[reading.gap.kind];
  }
  if (!reading.ceiling) {
    return "—";
  }
  const percent =
    reading.ceiling.percent >= 10
      ? reading.ceiling.percent.toFixed(0)
      : reading.ceiling.percent.toFixed(1);
  return `≤ ${percent}%`;
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
  push(
    "Which store this is matters as much as the counts. Read the address above before" +
      " quoting any number here: a local re-import and the production corpus do not agree," +
      " and this report asserts only what the store it measured contains.",
  );
  push();
  push(
    "**This report contains no achieved coverage percentage.** Not one. The reason is in" +
      " *Why there are no percentages* below, and it is the most important finding here.",
  );
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

  push("## Why there are no percentages");
  push();
  for (const gap of report.gaps) {
    push(`### ${GAP_LABEL[gap.kind]}`);
    push();
    push(gap.detail);
    push();
    push(`*Unblocked by:* ${gap.unblockedBy}`);
    push();
  }

  push("## By state");
  push();
  push(
    "`held` is agency records in the measured store. The two denominator columns are that" +
      " state's own published counts — never a share of the national figure. `reading` is a" +
      " ceiling or the name of a gap, never achieved coverage.",
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
    push("## Cross-checks against other stores");
    push();
    for (const check of report.corpusCrossChecks) {
      push(
        `- ${check.store}: ${num(check.count)}${check.note ? ` — ${check.note}` : ""}`,
      );
    }
    push();
  }

  return `${lines.join("\n").trimEnd()}\n`;
};
