/**
 * Tripwire for the personnel UGC suspension (INS-70).
 *
 * The suspension is a two-part control: `src/lib/ugc-policy.ts` hides the entry
 * points and `SUSPENDED_FORM_NAMES` in the forms-api Lambda refuses the
 * submissions. In 2026 the whole control was added by PR #8, then silently
 * dropped when `main` was merged into a long-lived redesign branch that
 * predated it. Every artifact PR #8 shipped disappeared together — including
 * the build-time validator that was supposed to catch exactly this, and the
 * `validate:personnel-ugc` wiring that ran it. The regression reached
 * production and was invisible to `git log -S`, to review, and to CI.
 *
 * So this file deliberately does NOT import the policy module to decide what to
 * expect. It hard-codes the expected shape and asserts the control's parts
 * exist and agree. A guard that derives its expectations from the thing it
 * guards cannot notice that thing being deleted.
 *
 * These tests run in `npm run test`, with no build step, so the control is
 * checked on every CI run and not only on a full `npm run build`.
 *
 * If the suspension is lifted deliberately, delete this file in the same commit
 * that lifts it, so that the intent is recorded rather than inferred.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const read = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

const SUSPENDED_FORM_NAMES = ["personnelNew", "officerEdit"];

const LAMBDA_PATH =
  "infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs";
const POLICY_PATH = "src/lib/ugc-policy.ts";

/**
 * Every surface that offers a personnel submission entry point. Each must make
 * its rendering conditional on the policy flag. Found by grepping for the two
 * intake URLs; if a new entry point is added, add it here too.
 */
const ENTRY_POINT_PAGES = [
  "src/pages/personnel/new/index.astro",
  "src/pages/personnel/suggest-edit/index.astro",
  "src/pages/personnel/index.astro",
  "src/pages/personnel/[slug]/index.astro",
  "src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro",
];

test("the policy module still declares the suspension in force", () => {
  const source = read(POLICY_PATH);
  assert.match(
    source,
    /export const PERSONNEL_UGC_SUSPENDED = true;/,
    `${POLICY_PATH} must declare PERSONNEL_UGC_SUSPENDED = true`,
  );
});

test("the forms API refuses every suspended form name", () => {
  const source = read(LAMBDA_PATH);

  const declaration = source.match(
    /const SUSPENDED_FORM_NAMES = new Set\(\[([^\]]*)\]\)/,
  );
  assert.ok(declaration, `${LAMBDA_PATH} must declare SUSPENDED_FORM_NAMES`);

  for (const formName of SUSPENDED_FORM_NAMES) {
    assert.match(
      declaration[1],
      new RegExp(`"${formName}"`),
      `SUSPENDED_FORM_NAMES must contain ${formName}`,
    );
  }

  assert.match(
    source,
    /if \(SUSPENDED_FORM_NAMES\.has\(formName\)\)/,
    "the suspended-form check must still be enforced in the request path",
  );
});

test("the forms API refuses suspended names before reCAPTCHA and before any write", () => {
  // Ordering is the whole value of the control: a submission rejected after
  // reCAPTCHA but before storage still burns quota, and one rejected after
  // storage is not rejected at all.
  // Scoped to submitForm's body: other helpers write to S3 earlier in the
  // file, so raw file position is not execution order.
  const whole = read(LAMBDA_PATH);
  const submitFormStart = whole.indexOf("async function submitForm(");
  assert.ok(submitFormStart > 0, "submitForm must exist");
  const source = whole.slice(submitFormStart);

  const gateIndex = source.indexOf("if (SUSPENDED_FORM_NAMES.has(formName))");
  const recaptchaIndex = source.indexOf("await verifyRecaptchaEnterprise(");
  const putIndex = source.indexOf("new PutObjectCommand(");

  assert.ok(gateIndex > 0, "the suspended-form check must exist in submitForm");
  assert.ok(recaptchaIndex > 0, "the reCAPTCHA call must exist in submitForm");
  assert.ok(putIndex > 0, "the S3 write must exist in submitForm");
  assert.ok(
    gateIndex < recaptchaIndex,
    "the suspended-form check must run before reCAPTCHA verification",
  );
  assert.ok(
    gateIndex < putIndex,
    "the suspended-form check must run before anything is written",
  );
});

test("suspended form names stay in the allow-list so they get the 403, not a 400", () => {
  const source = read(LAMBDA_PATH);
  const allowList = source.match(
    /const ALLOWED_FORM_NAMES = new Set\(\[([^\]]*)\]\)/,
  );
  assert.ok(allowList, `${LAMBDA_PATH} must declare ALLOWED_FORM_NAMES`);

  for (const formName of SUSPENDED_FORM_NAMES) {
    assert.match(
      allowList[1],
      new RegExp(`"${formName}"`),
      `${formName} must stay in ALLOWED_FORM_NAMES`,
    );
  }
});

test("every personnel submission entry point is gated on the policy flag", () => {
  for (const page of ENTRY_POINT_PAGES) {
    const source = read(page);
    assert.match(
      source,
      /PERSONNEL_UGC_SUSPENDED/,
      `${page} offers a personnel submission entry point, so it must consult PERSONNEL_UGC_SUSPENDED`,
    );
  }
});

test("no source file outside the gated set references a personnel intake URL", () => {
  // Catches a redesign reintroducing an entry point somewhere new. The dist
  // validator covers generated output; this covers source, without a build.
  const offenders = [];
  const stack = [path.join(repoRoot, "src")];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!/\.(astro|ts|tsx|js|mjs)$/.test(entry.name)) {
        continue;
      }
      const relativePath = path
        .relative(repoRoot, fullPath)
        .replaceAll(path.sep, "/");
      if (ENTRY_POINT_PAGES.includes(relativePath)) {
        continue;
      }
      if (
        /\/personnel\/(?:new|suggest-edit)\//.test(
          readFileSync(fullPath, "utf8"),
        )
      ) {
        offenders.push(relativePath);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "these files reference a personnel intake URL but are not gated on PERSONNEL_UGC_SUSPENDED; gate them and add them to ENTRY_POINT_PAGES",
  );
});

test("the build still runs the personnel UGC validator", () => {
  // PR #8's validator was deleted *and* unwired from package.json in the same
  // merge, which is why nothing failed. Assert both the script and its wiring.
  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts ?? {};

  assert.equal(
    scripts["validate:personnel-ugc"],
    "node scripts/validate-personnel-ugc.mjs",
    "the validate:personnel-ugc script must exist",
  );
  assert.match(
    scripts.build ?? "",
    /npm run validate:personnel-ugc/,
    "npm run build must run validate:personnel-ugc",
  );
  assert.match(
    scripts.test ?? "",
    /npm run test:ugc/,
    "npm run test must run this tripwire",
  );
  assert.match(
    scripts.test ?? "",
    /npm run test:lambda/,
    "npm run test must run the forms-api Lambda tests",
  );

  // The validator file itself must still be there and still be reachable.
  assert.match(
    read("scripts/validate-personnel-ugc.mjs"),
    /PERSONNEL_UGC_SUSPENDED/,
    "the validator must still consult the policy flag",
  );
});

test("CI still runs these guards", () => {
  // The decisive reason the original regression shipped: no workflow in this
  // repo ran `npm run test`, `npm run validate`, or `npm run build`, so PR #8's
  // validator was never executed by CI even once. Without this assertion the
  // workflow can be deleted as quietly as the control was.
  const workflow = read(".github/workflows/safety-controls.yml");

  for (const script of ["npm run test:ugc", "npm run test:lambda"]) {
    assert.match(
      workflow,
      new RegExp(script.replace(/[:]/g, "[:]")),
      `.github/workflows/safety-controls.yml must run ${script}`,
    );
  }
  assert.match(
    workflow,
    /pull_request:/,
    "the guards must run on pull requests, not only on push",
  );
});
