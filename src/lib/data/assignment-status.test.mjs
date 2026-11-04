import assert from "node:assert/strict";
import test from "node:test";

import {
  getAssignmentStatus,
  formatAssignmentDate,
  isEndedAssignment,
  selectHeadlineAssignment,
} from "./assignment-status.js";

// Fixed "today" so these assertions do not rot as the clock moves.
const now = new Date("2026-10-24T00:00:00Z");

test("a null end_date is current, not former", () => {
  const status = getAssignmentStatus({ end_date: null }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.isEnded, false);
  assert.equal(status.endDate, null);
});

test("a missing end_date field is current", () => {
  assert.equal(getAssignmentStatus({}, { now }).isCurrent, true);
  assert.equal(getAssignmentStatus(undefined, { now }).isCurrent, false);
});

test("a past end_date is ended", () => {
  // The row behind the originating complaint on INS-75.
  const status = getAssignmentStatus({ end_date: "2023-07-24" }, { now });
  assert.equal(status.isEnded, true);
  assert.equal(status.isCurrent, false);
  assert.equal(status.endDate, "2023-07-24");
});

test("the implausible bound never promotes a null end_date to ended", () => {
  const status = getAssignmentStatus({ end_date: null }, { now });
  assert.equal(status.isEnded, false);
  assert.equal(status.endDateImplausible, false);
});

test("yesterday is ended", () => {
  assert.equal(isEndedAssignment({ end_date: "2026-10-23" }, { now }), true);
});

test("a Date instance is accepted", () => {
  assert.equal(
    getAssignmentStatus({ end_date: new Date("2023-07-24T00:00:00Z") }, { now })
      .isEnded,
    true,
  );
});

test("headline selection prefers an open assignment over a later-started ended one", () => {
  // Array position would pick the ended Hamilton row; end_date must win.
  const history = [
    { id: "open", start_date: "2020-01-01", end_date: null },
    { id: "ended", start_date: "2024-01-01", end_date: "2024-08-12" },
  ];
  const picked = selectHeadlineAssignment(history, { now });
  assert.equal(picked.assignment.id, "open");
  assert.equal(picked.isCurrent, true);
});

test("headline selection takes the latest-started open assignment", () => {
  const history = [
    { id: "older", start_date: "2018-01-01", end_date: null },
    { id: "newer", start_date: "2024-08-08", end_date: null },
  ];
  assert.equal(
    selectHeadlineAssignment(history, { now }).assignment.id,
    "newer",
  );
});

test("when every assignment has ended the headline is not current", () => {
  const history = [
    { id: "a", start_date: "2021-01-01", end_date: "2022-01-01" },
    { id: "b", start_date: "2023-05-30", end_date: "2023-07-24" },
  ];
  const picked = selectHeadlineAssignment(history, { now });
  assert.equal(picked.isCurrent, false);
  assert.equal(picked.assignment.id, "b");
  assert.equal(picked.endDate, "2023-07-24");
});

test("the headline is the most recently ended, not the last by start date", () => {
  // A short late stint that ended before a long earlier one must not be
  // presented as the most recent agency.
  const history = [
    { id: "long", start_date: "2010-01-01", end_date: "2025-01-01" },
    { id: "short", start_date: "2012-01-01", end_date: "2012-06-01" },
  ];
  const picked = selectHeadlineAssignment(history, { now });
  assert.equal(picked.assignment.id, "long");
  assert.equal(picked.endDate, "2025-01-01");
});

test("a single ended assignment is headlined and reported ended", () => {
  // The INS-75 originating profile: one agency, one ended row.
  const history = [
    { id: "only", start_date: "2023-05-30", end_date: "2023-07-24" },
  ];
  const picked = selectHeadlineAssignment(history, { now });
  assert.equal(picked.assignment.id, "only");
  assert.equal(picked.isCurrent, false);
  assert.equal(picked.endDate, "2023-07-24");
});

test("empty history yields no assignment and no employment claim", () => {
  const picked = selectHeadlineAssignment([], { now });
  assert.equal(picked.assignment, null);
  assert.equal(picked.isCurrent, false);
});

for (const end_date of [
  "2109-02-27",
  "2027-01-01",
  "2026-10-24",
  "2024-02-30",
  "not a date",
  "   ",
]) {
  test(`a reported uncertain separation ${JSON.stringify(end_date)} asserts neither current nor former employment`, () => {
    const status = getAssignmentStatus({ end_date }, { now });
    assert.equal(status.isCurrent, false);
    assert.equal(status.isEnded, false);
    assert.equal(status.isUnknown, true);
  });
}
test("a source end date retained outside the typed column cannot become current", () => {
  const status = getAssignmentStatus(
    {
      end_date: null,
      data_source_values: { end_date: { effective_value: "unreadable" } },
    },
    { now },
  );
  assert.equal(status.isCurrent, false);
  assert.equal(status.isEnded, false);
});
test("an explicit effective null correction is an open assignment", () => {
  assert.equal(
    getAssignmentStatus(
      {
        end_date: null,
        data_source_values: { end_date: { effective_value: null } },
      },
      { now },
    ).isCurrent,
    true,
  );
});

test("uncertain history is retained without claiming most recent employment", () => {
  const history = [
    { id: "uncertain", start_date: "2020-01-01", end_date: "unreadable" },
    { id: "ended", start_date: "2022-01-01", end_date: "2023-01-01" },
  ];
  const headline = selectHeadlineAssignment(history, { now });
  assert.equal(headline.isCurrent, false);
  assert.equal(headline.hasUncertainHistory, true);
});

test("assignment calendar dates do not shift in western time zones", () => {
  const oldTimezone = process.env.TZ;
  try {
    for (const timezone of [
      "America/Chicago",
      "America/Los_Angeles",
      "UTC",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = timezone;
      assert.equal(formatAssignmentDate("2023-07-24"), "Jul 24, 2023");
      assert.equal(formatAssignmentDate("2024-02-30"), "2024-02-30");
      assert.equal(formatAssignmentDate("unreadable"), "unreadable");
    }
  } finally {
    if (oldTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = oldTimezone;
  }
});

for (const assignment of [
  { start_date: "2024-01-01", end_date: "2023-01-01" },
  { start_date: "2027-01-01", end_date: null },
  { start_date: "unreadable", end_date: null },
  {
    start_date: null,
    end_date: null,
    data_source_values: { start_date: { effective_value: "2024-02-30" } },
  },
]) {
  test(`contradictory or uncertain start date cannot assert employment: ${JSON.stringify(assignment)}`, () => {
    const status = getAssignmentStatus(assignment, { now });
    assert.equal(status.isCurrent, false);
    assert.equal(status.isEnded, false);
    assert.equal(status.isUnknown, true);
  });
}
