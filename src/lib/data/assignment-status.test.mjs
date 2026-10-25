import assert from "node:assert/strict";
import test from "node:test";

import {
  getAssignmentStatus,
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
  assert.equal(getAssignmentStatus(undefined, { now }).isCurrent, true);
});

test("an empty-string end_date is current", () => {
  const status = getAssignmentStatus({ end_date: "   " }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.endDateInvalid, false);
});

test("a past end_date is ended", () => {
  // The row behind the originating complaint on INS-75.
  const status = getAssignmentStatus({ end_date: "2023-07-24" }, { now });
  assert.equal(status.isEnded, true);
  assert.equal(status.isCurrent, false);
  assert.equal(status.endDate, "2023-07-24");
});

test("a near-future end_date is still current", () => {
  // A scheduled separation has not happened yet.
  const status = getAssignmentStatus({ end_date: "2027-01-01" }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.isEnded, false);
  assert.equal(status.endDateImplausible, false);
});

test("an end_date exactly one year out is still current", () => {
  const status = getAssignmentStatus({ end_date: "2027-10-24" }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.endDateImplausible, false);
});

test("an implausibly far end_date is ended, not current", () => {
  // The only future-dated row in the corpus: end_date 2109-02-27 on a 2015
  // start. Reading that as present-tense employment would turn a typo into a
  // confident claim that a named person currently works somewhere.
  const status = getAssignmentStatus({ end_date: "2109-02-27" }, { now });
  assert.equal(status.isEnded, true);
  assert.equal(status.isCurrent, false);
  assert.equal(status.endDateImplausible, true);
});

test("the implausible bound never promotes a null end_date to ended", () => {
  const status = getAssignmentStatus({ end_date: null }, { now });
  assert.equal(status.isEnded, false);
  assert.equal(status.endDateImplausible, false);
});

test("an end_date of today is still current", () => {
  const status = getAssignmentStatus({ end_date: "2026-10-24" }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.isEnded, false);
});

test("yesterday is ended", () => {
  assert.equal(isEndedAssignment({ end_date: "2026-10-23" }, { now }), true);
});

test("a timestamp end_date compares at day granularity", () => {
  // Late-in-day UTC timestamps must not read as a different day.
  assert.equal(
    getAssignmentStatus({ end_date: "2026-10-24T23:30:00Z" }, { now })
      .isCurrent,
    true,
  );
  assert.equal(
    getAssignmentStatus({ end_date: "2026-10-23T23:30:00Z" }, { now }).isEnded,
    true,
  );
});

test("a Date instance is accepted", () => {
  assert.equal(
    getAssignmentStatus({ end_date: new Date("2023-07-24T00:00:00Z") }, { now })
      .isEnded,
    true,
  );
});

test("an unreadable end_date stays current and is flagged", () => {
  const status = getAssignmentStatus({ end_date: "not a date" }, { now });
  assert.equal(status.isCurrent, true);
  assert.equal(status.endDateInvalid, true);
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

test("a future end_date keeps the profile current", () => {
  const history = [
    { id: "a", start_date: "2020-01-01", end_date: "2021-01-01" },
    { id: "scheduled", start_date: "2021-02-01", end_date: "2027-06-30" },
  ];
  const picked = selectHeadlineAssignment(history, { now });
  assert.equal(picked.assignment.id, "scheduled");
  assert.equal(picked.isCurrent, true);
});
