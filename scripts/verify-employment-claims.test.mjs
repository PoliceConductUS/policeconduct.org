import assert from "node:assert/strict";
import test from "node:test";

import { classifyEmploymentClaims } from "./verify-employment-claims.mjs";

// Minimal stand-ins for the shapes the personnel template emits.
const page = ({ label, worksFor, ended }) => `
<html><head>
<script type="application/ld+json">{"@graph":[{"@type":"Person","name":"A B"${
  worksFor ? ',"worksFor":{"@id":"https://x/#organization"}' : ""
}}]}</script>
</head><body>
<p class="personnel-current-line astro-x">${label}: <a href="/a/">An Agency</a>
<span aria-hidden="true"> · </span>Somewhere, TX${
  ended
    ? `<span aria-hidden="true"> · </span><span class="personnel-assignment-ended">assignment ended ${ended}</span>`
    : ""
}</p>
</body></html>`;

test("the pre-fix shape is a violation: ended headline plus worksFor", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Most recent agency", worksFor: true, ended: null }),
  );
  assert.equal(result.headline, "ended");
  assert.equal(result.worksFor, true);
  assert.deepEqual(result.violations.length, 2);
  assert.match(result.violations[0], /worksFor/);
  assert.match(result.violations[1], /no explicit end date/);
});

test("the fixed shape passes: ended headline, no worksFor, end date shown", () => {
  const result = classifyEmploymentClaims(
    page({
      label: "Most recent agency",
      worksFor: false,
      ended: "Jul 24, 2023",
    }),
  );
  assert.equal(result.headline, "ended");
  assert.equal(result.worksFor, false);
  assert.equal(result.endDate, "Jul 24, 2023");
  assert.deepEqual(result.violations, []);
});

test("an ended page that hides the end date is still a violation", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Most recent agency", worksFor: false, ended: null }),
  );
  assert.deepEqual(result.violations, [
    "ended assignment renders no explicit end date",
  ]);
});

test("a genuinely current assignment keeps worksFor and passes", () => {
  const result = classifyEmploymentClaims(
    page({ label: "Current agency", worksFor: true, ended: null }),
  );
  assert.equal(result.headline, "current");
  assert.equal(result.worksFor, true);
  assert.deepEqual(result.violations, []);
});

test("a current headline carrying an end date is a violation", () => {
  // Guards rule 3: a null end_date must not be swept into "former".
  const result = classifyEmploymentClaims(
    page({ label: "Current agency", worksFor: true, ended: "Jul 24, 2023" }),
  );
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /must read as current/);
});

test("a page with no employment headline is reported as undetected", () => {
  const result = classifyEmploymentClaims("<html><body>nothing</body></html>");
  assert.equal(result.headline, null);
  assert.deepEqual(result.violations, []);
});
