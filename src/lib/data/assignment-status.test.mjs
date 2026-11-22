import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAssignmentDate,
  isCurrentAssignment,
  isEndedAssignment,
} from "./assignment-status.js";

// These predicates only feed agency personnel counts (current, former,
// uncertain), kept as before commit 84c5cec until intake supplies the counts.
// Fixed "today" so these assertions do not rot as the clock moves.
const now = new Date("2026-10-24T00:00:00Z");
const status = (assignment) => ({
  isCurrent: isCurrentAssignment(assignment, { now }),
  isEnded: isEndedAssignment(assignment, { now }),
});

test("a null end_date counts as current, not former", () => {
  assert.deepEqual(status({ end_date: null }), {
    isCurrent: true,
    isEnded: false,
  });
});

test("a missing end_date field counts as current", () => {
  assert.equal(status({}).isCurrent, true);
});

test("a past end_date counts as ended", () => {
  assert.deepEqual(status({ end_date: "2023-07-24" }), {
    isCurrent: false,
    isEnded: true,
  });
});

test("yesterday counts as ended", () => {
  assert.equal(status({ end_date: "2026-10-23" }).isEnded, true);
});

test("a Date instance is accepted", () => {
  assert.equal(
    status({ end_date: new Date("2023-07-24T00:00:00Z") }).isEnded,
    true,
  );
});

for (const end_date of [
  "2109-02-27",
  "2027-01-01",
  "2026-10-24",
  "2024-02-30",
  "not a date",
  "   ",
]) {
  test(`an uncertain end date ${JSON.stringify(end_date)} counts as neither current nor former`, () => {
    assert.deepEqual(status({ end_date }), {
      isCurrent: false,
      isEnded: false,
    });
  });
}

test("a source end date retained outside the typed column does not count as current", () => {
  assert.deepEqual(
    status({
      end_date: null,
      data_source_values: { end_date: { effective_value: "unreadable" } },
    }),
    { isCurrent: false, isEnded: false },
  );
});

test("an explicit effective null end date counts as current", () => {
  assert.equal(
    status({
      end_date: null,
      data_source_values: { end_date: { effective_value: null } },
    }).isCurrent,
    true,
  );
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
  test(`a contradictory or uncertain start date counts as neither current nor former: ${JSON.stringify(assignment)}`, () => {
    assert.deepEqual(status(assignment), { isCurrent: false, isEnded: false });
  });
}

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
