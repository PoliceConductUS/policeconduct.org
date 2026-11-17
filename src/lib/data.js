import { parseSourceValues, reportedDate } from "./data/annotation-values.js";
export const groupBy = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = row?.[key];
    if (!value) {
      return acc;
    }
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(row);
    return acc;
  }, {});

export const mapBy = (rows, key) =>
  rows.reduce((acc, row) => {
    acc[row[key]] = row;
    return acc;
  }, {});

/**
 * @template T
 * @param {T[]} entries
 * @returns {T[]}
 */
export const normalizeAgencyHistory = (entries) =>
  entries
    .map((entry) => {
      const evidence = parseSourceValues(entry.data_source_values);
      return {
        ...entry,
        start_date: reportedDate(entry.start_date, evidence.start_date),
        end_date: reportedDate(entry.end_date, evidence.end_date),
      };
    })
    .sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date) : new Date(0);
      const bDate = b.start_date ? new Date(b.start_date) : new Date(0);
      return aDate - bDate;
    });
