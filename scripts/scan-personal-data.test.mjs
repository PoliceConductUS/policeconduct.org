import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ALLOWLIST,
  DENIED_PATH_SEGMENTS,
  scanContent,
  scanFilename,
  scanSubmissionPath,
} from "./scan-personal-data.mjs";

const ROOT = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).stdout.trim();

// The two files that sat world-readable on this public repo for ~3 months
// (INS-29). Addressed by blob SHA rather than re-committed as fixtures: File 2
// is a private individual's name, email and details, and putting it back in
// the tree to test the guard against putting it in the tree would be absurd.
// History was deliberately not rewritten, so both blobs remain reachable.
const INS29_BLOBS = {
  machineArtifact: {
    path: "docs/TCOLE Import .md",
    sha: "a5338345534fdbc35f0c0b1ff76db566acd6754f",
  },
  thirdPartyPersonalInfo: {
    path: "docs/volunteer-packets/logan-taylor-intro-email.md",
    sha: "2508ece3a09b98e55580046a86c5e47c589835c6",
  },
};

const readHistoricalBlob = (sha) => {
  const result = spawnSync("git", ["cat-file", "blob", sha], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `INS-29 blob ${sha} is unreachable. This test needs full history; CI checks out with fetch-depth: 0.`,
  );
  return result.stdout;
};

// Fixtures are assembled from fragments so this test file does not itself trip
// the rules it is testing. The meta-test at the bottom proves that.
const homePath = ["", "Users", "alice", "dev", "notes.md"].join("/");
const linuxHomePath = ["", "home", "bob", "dev", "notes.md"].join("/");
const linuxbrewLine = `  elif [[ -x ${["", "home", "linuxbrew", ".linuxbrew", "bin", "brew"].join("/")} ]]; then`;

test("Control A catches File 1, the machine-artifact blob from INS-29", () => {
  const { path, sha } = INS29_BLOBS.machineArtifact;
  const findings = scanContent(path, readHistoricalBlob(sha));

  assert.ok(
    findings.length > 0,
    "the pattern gate must reject the file it was built to catch",
  );
  assert.ok(
    findings.some((finding) => finding.ruleId === "cloud-storage-account"),
    "the Google Drive account folder is the specific artifact that leaked",
  );
  for (const finding of findings) {
    assert.equal(finding.control, "A");
    assert.doesNotMatch(
      finding.detail,
      /Users|CloudStorage|@/,
      "findings must stay redacted; CI logs are readable by anyone with repo access",
    );
  }
});

test("Control B catches File 2, which no pattern can see", () => {
  const { path, sha } = INS29_BLOBS.thirdPartyPersonalInfo;

  // This is the measured finding that forced two controls instead of one:
  // a person's name and email are textually identical to the public-official
  // contacts that legitimately belong in our corpus, so Control A is blind
  // to this file. If this assertion ever starts failing, do not celebrate --
  // check whether a rule has become broad enough to fire on corpus data.
  assert.deepEqual(
    scanContent(path, readHistoricalBlob(sha)),
    [],
    "File 2 is invisible to the pattern gate; that is why Control B exists",
  );

  const structural = scanSubmissionPath(path);
  assert.equal(structural.length, 1, "the structural rule must reject it");
  assert.equal(structural[0].control, "B");
  assert.equal(structural[0].ruleId, "third-party-submission-path");
});

test("the linuxbrew shared path is not a finding", () => {
  assert.deepEqual(scanContent("scripts/bootstrap-dev.sh", linuxbrewLine), []);

  // Still catches a real person's home directory in the same file.
  assert.equal(
    scanContent("scripts/bootstrap-dev.sh", linuxHomePath).length,
    1,
  );
});

test("Control A rules fire on their artifacts", () => {
  const cases = [
    ["home-path", homePath],
    [
      "home-path-windows",
      `C:${String.fromCharCode(92)}Users${String.fromCharCode(92)}alice`,
    ],
    [
      "home-path-flattened",
      `/private/tmp/claude-501/-${"Users"}-alice-dev-thing/x`,
    ],
    [
      "cloud-storage-account",
      `/x/Library/CloudStorage/${"GoogleDrive"}-someone@example.com/My Drive/f`,
    ],
    ["github-token", `gh${"p"}_${"A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"}`],
    ["aws-access-key-id", `AKIA${"ABCDEFGHIJ234567"}`],
    ["private-key-block", `-----BEGIN${" "}OPENSSH PRIVATE KEY-----`],
    ["api-secret-key", `sk-${"ant"}-${"abcdefghij0123456789ABCDEFGHIJ"}`],
    ["slack-token", `xox${"b"}-${"1234567890-abcdefghij"}`],
    [
      "json-web-token",
      `ey${"J"}hbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZXJ2aWNlX3JvbGUifQ.c2lnbmF0dXJlX2hlcmU`,
    ],
  ];

  for (const [ruleId, fixture] of cases) {
    const findings = scanContent("fixture.txt", fixture);
    assert.ok(
      findings.some((finding) => finding.ruleId === ruleId),
      `rule ${ruleId} did not fire on its own artifact`,
    );
  }
});

test("Control A rejects local and credential filename shapes", () => {
  const denied = [
    "some/dir/config.local.json",
    ".env",
    ".env.production",
    "infrastructure/server.pem",
    "home/.ssh/id_rsa",
  ];
  for (const path of denied) {
    assert.ok(scanFilename(path).length > 0, `${path} should be rejected`);
  }

  const allowed = [
    ".env.example",
    "infrastructure/bootstrap/terraform.tfvars.example",
    "src/lib/data/summaries.ts",
    "docs/local-development.md",
  ];
  for (const path of allowed) {
    assert.deepEqual(scanFilename(path), [], `${path} should be accepted`);
  }
});

test("Control B denies every submission-shaped directory it documents", () => {
  for (const segment of DENIED_PATH_SEGMENTS) {
    assert.equal(
      scanSubmissionPath(`docs/${segment}/anything.md`).length,
      1,
      `segment ${segment} is documented as denied but does not deny`,
    );
  }

  // A directory merely containing a denied word is not a denied directory.
  assert.deepEqual(scanSubmissionPath("src/pages/volunteer/index.astro"), []);
  assert.deepEqual(
    scanSubmissionPath("openspec/specs/interaction-submission-flow/spec.md"),
    [],
  );
});

test("every allowlist entry is scoped, dated and explained", () => {
  for (const entry of ALLOWLIST) {
    assert.ok(entry.path, "an allowlist entry must name an exact path");
    assert.ok(
      entry.ruleId,
      "an allowlist entry must name one rule; blanket exemptions are not allowed",
    );
    assert.match(
      entry.reason,
      /20\d\d-\d\d-\d\d/,
      `allowlist entry for ${entry.path} must carry a date`,
    );
    assert.ok(
      entry.reason.length > 80,
      `allowlist entry for ${entry.path} must explain itself`,
    );
  }
});

test("the gate's own source does not trip the gate", () => {
  for (const name of [
    "scan-personal-data.mjs",
    "scan-personal-data.test.mjs",
  ]) {
    const path = `scripts/${name}`;
    const source = readFileSync(join(ROOT, path), "utf8");
    assert.deepEqual(
      scanContent(path, source),
      [],
      `${name} must not match its own rules; it carries no allowlist entry`,
    );
  }
});

test("the current tree passes with zero findings", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/scan-personal-data.mjs", "--tracked"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `a blocking gate needs a clean baseline. Findings:\n${result.stderr}`,
  );
  assert.match(result.stdout, /0 findings\./);
});
