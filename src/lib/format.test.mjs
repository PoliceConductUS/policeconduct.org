import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLongDate, formatShortDate } from "./format.js";

test("formats a stored date", () => {
  assert.equal(formatShortDate("2024-03-05T12:00:00Z"), "Mar 5, 2024");
  assert.equal(formatLongDate("2024-03-05T12:00:00Z"), "March 5, 2024");
});

test("keeps the calendar day of a date-only value west of UTC", () => {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "America/Chicago";
  try {
    assert.equal(formatShortDate("2026-07-30"), "Jul 30, 2026");
    assert.equal(formatLongDate("2026-07-30"), "July 30, 2026");
  } finally {
    process.env.TZ = previousTimeZone;
  }
});

for (const value of [null, undefined, ""]) {
  test(`fails loudly on a missing date (${String(value)})`, () => {
    assert.throws(() => formatShortDate(value), /missing date/);
    assert.throws(() => formatLongDate(value), /missing date/);
  });
}

test("fails loudly on an invalid date", () => {
  assert.throws(() => formatShortDate("not a date"), /invalid date/);
});
