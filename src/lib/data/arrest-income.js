/**
 * @typedef {{cells: {month: string, incomeTract: string | null, incomeStatus: string, arrests: number}[], residential_income_by_tract: Record<string, {estimate: number | null}>}} IncomeEvidence
 */
const ranges = [
  [25000, "Under $25,000"],
  [50000, "$25,000–$49,999"],
  [75000, "$50,000–$74,999"],
  [100000, "$75,000–$99,999"],
  [150000, "$100,000–$149,999"],
  [Infinity, "$150,000 or more"],
];
/**
 * @param {IncomeEvidence} evidence
 * @param {string} firstMonth
 * @param {string} lastMonth
 */
function counts(evidence, firstMonth, lastMonth) {
  const result = Array(7).fill(0);
  for (const cell of evidence.cells) {
    if (cell.month < firstMonth || cell.month > lastMonth) continue;
    let index = 6;
    if (cell.incomeStatus === "matched") {
      const estimate =
        cell.incomeTract === null
          ? undefined
          : evidence.residential_income_by_tract[cell.incomeTract]?.estimate;
      if (
        typeof estimate !== "number" ||
        !Number.isFinite(estimate) ||
        estimate < 0
      )
        throw new Error(
          "Matched arrest is missing a valid neighborhood income estimate",
        );
      index = ranges.findIndex(([limit]) => estimate < Number(limit));
    }
    result[index] += cell.arrests;
  }
  return result;
}
/**
 * @param {IncomeEvidence} personnel
 * @param {IncomeEvidence} agency
 * @param {string} firstMonth
 * @param {string} lastMonth
 */
export function incomeRows(personnel, agency, firstMonth, lastMonth) {
  const ownCounts = counts(personnel, firstMonth, lastMonth);
  const agencyCounts = counts(agency, firstMonth, lastMonth);
  return [...ranges.map(([, label]) => String(label)), "Unknown"].map(
    (label, index) => ({
      label,
      count: ownCounts[index],
      agencyCount: agencyCounts[index],
    }),
  );
}
