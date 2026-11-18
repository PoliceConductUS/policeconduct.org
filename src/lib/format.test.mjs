import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLongDate, formatShortDate } from "./format.js";

test("formats a stored date", () => {
  assert.equal(formatShortDate("2024-03-05T12:00:00Z"), "Mar 5, 2024");
  assert.equal(formatLongDate("2024-03-05T12:00:00Z"), "March 5, 2024");
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
