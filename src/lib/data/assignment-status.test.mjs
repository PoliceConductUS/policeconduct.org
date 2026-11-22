import assert from "node:assert/strict";
import test from "node:test";

import { formatAssignmentDate } from "./assignment-status.js";

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
