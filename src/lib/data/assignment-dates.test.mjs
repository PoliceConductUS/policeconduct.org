import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_ASSIGNMENT_YEARS,
  assignmentMonths,
  endDateDefect,
  isEndDateImplausible,
  publishableEndDate,
} from "./assignment-dates.js";

// Fixed clock so "has not happened yet" is reproducible.
const now = new Date("2026-10-24T00:00:00Z");
const at = { now };

test("withholds the separation date TCOLE published for INS-88", () => {
  // shaunte-rideaux-32fe19, Contract Jailer, as published in the 2025-02-10
  // TCOLE production and stored verbatim.
  assert.equal(endDateDefect("2015-04-22", "2109-02-27", at), "in-the-future");
  assert.equal(publishableEndDate("2015-04-22", "2109-02-27", at), null);
  // The 93-year tenure the raw pair produced contributes nothing.
  assert.equal(assignmentMonths("2015-04-22", "2109-02-27", at), 0);
});

test("withholds a separation date that precedes its own start", () => {
  // juan-vitar-cd91e1 at Talty Police Department: "Oct 24, 2024 to Oct 23,
  // 2023" was live. 23 more rows in the same production share this shape.
  assert.equal(endDateDefect("2024-10-24", "2023-10-23", at), "before-start");
  assert.equal(publishableEndDate("2024-10-24", "2023-10-23", at), null);
  // One day is enough; four rows in the corpus are exactly 2025-01-01 to
  // 2024-12-31.
  assert.equal(endDateDefect("2025-01-01", "2024-12-31", at), "before-start");
});

test("publishes separation dates that can be true", () => {
  // The longest genuine completed assignment measured in the corpus: 50.8 years.
  assert.equal(endDateDefect("1974-01-15", "2024-11-01", at), null);
  assert.equal(
    publishableEndDate("1974-01-15", "2024-11-01", at),
    "2024-11-01",
  );
  assert.equal(isEndDateImplausible("2015-04-22", "2019-02-27", at), false);
  // Same day start and end is a real one-day appointment, not a defect.
  assert.equal(endDateDefect("2024-06-03", "2024-06-03", at), null);
  // Yesterday is a separation; today is too.
  assert.equal(endDateDefect("2020-01-01", "2026-10-24", at), null);
});

test("treats an absent separation date as still serving, not as a defect", () => {
  assert.equal(endDateDefect("2015-04-22", null, at), null);
  assert.equal(endDateDefect("2015-04-22", undefined, at), null);
  assert.equal(publishableEndDate("2015-04-22", null, at), null);
  assert.equal(isEndDateImplausible("2015-04-22", "", at), false);
  // An open assignment still accrues tenure to the build clock.
  assert.equal(assignmentMonths("2025-10-24", null, at), 12);
});

test("brackets the span threshold on both sides", () => {
  const start = new Date("1950-01-01T00:00:00Z");
  const within = new Date(start);
  within.setUTCFullYear(start.getUTCFullYear() + MAX_ASSIGNMENT_YEARS - 1);
  const beyond = new Date(start);
  beyond.setUTCFullYear(start.getUTCFullYear() + MAX_ASSIGNMENT_YEARS + 1);
  assert.equal(endDateDefect(start, within, at), null);
  assert.equal(endDateDefect(start, beyond, at), "span-too-long");
});

test("leaves unparseable dates to the loaders rather than guessing", () => {
  assert.equal(endDateDefect("2015-04-22", "not a date", at), null);
  assert.equal(endDateDefect(null, "2024-01-01", at), null);
  assert.equal(assignmentMonths(null, "2024-01-01", at), 0);
});

test("defaults to the build clock when no clock is injected", () => {
  const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 50);
  assert.equal(isEndDateImplausible("2015-04-22", farFuture), true);
  assert.equal(isEndDateImplausible("2015-04-22", "2019-02-27"), false);
});
