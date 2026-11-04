import { expect, test } from "@playwright/test";
import { agencyStatusPresentation } from "../../src/lib/agency-status";

for (const fixture of [
  {
    status: null,
    date: null,
    label: null,
    dateLabel: null,
    summary: "",
    prominence: "compact",
  },
  {
    status: null,
    date: "2024-01-01",
    label: null,
    dateLabel: "January 1, 2024",
    summary: "Status date: January 1, 2024.",
    prominence: "compact",
  },
  {
    status: "ACTIVE",
    date: null,
    label: "Active",
    dateLabel: null,
    summary: "Status: Active.",
    prominence: "compact",
  },
  {
    status: "aCtIvE",
    date: "1899-12-31",
    label: "Active",
    dateLabel: "December 31, 1899",
    summary: "Status: Active. Status date: December 31, 1899.",
    prominence: "compact",
  },
  {
    status: "INACTIVE",
    date: "2004-01-07",
    label: "Inactive",
    dateLabel: "January 7, 2004",
    summary: "Status: Inactive. Status date: January 7, 2004.",
    prominence: "notice",
  },
  {
    status: "Suspended",
    date: null,
    label: "Suspended",
    dateLabel: null,
    summary: "Status: Suspended.",
    prominence: "notice",
  },
]) {
  test(`status ${fixture.status} and date ${fixture.date} preserve independently supplied facts`, () => {
    const result = agencyStatusPresentation(fixture.status, fixture.date);
    expect(result).toEqual({
      label: fixture.label,
      dateLabel: fixture.dateLabel,
      summary: fixture.summary,
      prominence: fixture.prominence,
    });
  });
}
