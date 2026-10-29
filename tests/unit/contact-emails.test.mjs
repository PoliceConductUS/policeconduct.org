import { test } from "node:test";
import assert from "node:assert/strict";
import { contactEmailsForDisplay } from "../../src/lib/contact-emails.js";

test("email display keeps separate addresses and no empty mailto recipients", () => {
  assert.deepEqual(
    contactEmailsForDisplay(" office@example.org ;; records@example.org; "),
    ["office@example.org", "records@example.org"],
  );
  assert.deepEqual(contactEmailsForDisplay("office@example.org"), [
    "office@example.org",
  ]);
  assert.deepEqual(contactEmailsForDisplay(null), []);
  assert.deepEqual(contactEmailsForDisplay(undefined), []);
  assert.deepEqual(contactEmailsForDisplay(""), []);
  assert.deepEqual(
    contactEmailsForDisplay("invalid source value;office@example.org"),
    ["invalid source value", "office@example.org"],
  );
});
