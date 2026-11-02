import { test } from "node:test";
import assert from "node:assert/strict";
import { caseSlugRedirects } from "./case-slug-redirects.mjs";
test("both historical URL forms reach the current case in one hop", () => {
  assert.deepEqual(
    caseSlugRedirects(
      [
        { old_path: "/civil-cases/old/", civil_case_id: "stable", slug: "new" },
        {
          old_path: "/civil-litigation/tx/old/",
          civil_case_id: "stable",
          slug: "new",
        },
      ],
      () => true,
    ).map((r) => [r.from, r.to, r.status]),
    [
      ["/civil-cases/old/", "/civil-cases/new/", 301],
      ["/civil-litigation/tx/old/", "/civil-cases/new/", 301],
    ],
  );
});
test("missing destination and self redirects fail", () => {
  assert.throws(
    () =>
      caseSlugRedirects(
        [
          {
            old_path: "/civil-cases/old/",
            civil_case_id: "stable",
            slug: "new",
          },
        ],
        () => false,
      ),
    /built/,
  );
  assert.throws(
    () =>
      caseSlugRedirects(
        [
          {
            old_path: "/civil-cases/new/",
            civil_case_id: "stable",
            slug: "new",
          },
        ],
        () => true,
      ),
    /self/,
  );
});

test("duplicate historical URL ownership fails", () => {
  assert.throws(
    () =>
      caseSlugRedirects(
        [
          {
            old_path: "/civil-cases/old/",
            civil_case_id: "first",
            slug: "first-current",
          },
          {
            old_path: "/civil-cases/old/",
            civil_case_id: "second",
            slug: "second-current",
          },
        ],
        () => true,
      ),
    /Duplicate historical URL ownership/,
  );
});
