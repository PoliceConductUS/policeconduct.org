import { expect, test } from "@playwright/test";
import { agencyStatusPresentation } from "../../src/lib/agency-status";

for (const fixture of [
  {
    status: null,
    date: null,
    dateLabel: null,
    summary: "",
  },
  {
    status: null,
    date: "2024-01-01",
    dateLabel: "January 1, 2024",
    summary: "Status date: January 1, 2024.",
  },
  {
    status: "ACTIVE",
    date: null,
    dateLabel: null,
    summary: "Status: ACTIVE.",
  },
  {
    status: "aCtIvE",
    date: "1899-12-31",
    dateLabel: "December 31, 1899",
    summary: "Status: aCtIvE. Status date: December 31, 1899.",
  },
  {
    status: "Suspended",
    date: null,
    dateLabel: null,
    summary: "Status: Suspended.",
  },
]) {
  test(`status ${fixture.status} and date ${fixture.date} are shown as stored`, () => {
    expect(agencyStatusPresentation(fixture.status, fixture.date)).toEqual({
      label: fixture.status,
      dateLabel: fixture.dateLabel,
      summary: fixture.summary,
    });
  });
}
