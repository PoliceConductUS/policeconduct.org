#!/usr/bin/env node
// Guards the public repo against committing personal data. INS-65.
//
// Two independent controls, because one cannot cover both failure modes:
//
//   Control A — pattern gate. Catches machine and account artifacts: home
//   directory paths, cloud-storage account folders, credential shapes, and
//   local/secret-shaped filenames. These are mechanically detectable.
//
//   Control B — structural rule. Third-party-submitted personal information
//   must not live in the repo at all, so submission-shaped directories are
//   denied outright. A pattern gate cannot catch this failure mode: a
//   volunteer's name and email are textually identical to the public-official
//   contacts and officer names that legitimately belong in our corpus, so any
//   name/email detector over a corpus made of names is unkeepable.
//
// Usage:
//   node scripts/scan-personal-data.mjs --staged          # pre-commit hook
//   node scripts/scan-personal-data.mjs --base <ref>      # CI, PR diff
//   node scripts/scan-personal-data.mjs --tracked         # whole tree baseline
//   node scripts/scan-personal-data.mjs --files a.md b.md # explicit paths

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

// Slashes are written escaped so this rule file never matches its own source.
// Verified by a meta-test in scan-personal-data.test.mjs.
export const CONTENT_RULES = [
  {
    id: "home-path",
    label: "committer home directory path",
    regex: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g,
    // Real shared system accounts, not a person's machine.
    allowMatch: /^\/home\/(?:linuxbrew|runner)\//,
    remedy:
      "Use a repo-relative path. Absolute home paths leak the committer's account name and local layout.",
  },
  {
    id: "home-path-windows",
    label: "Windows user profile path",
    regex: /[A-Za-z]:\\\\?Users\\\\?/g,
    remedy: "Use a repo-relative path.",
  },
  {
    id: "home-path-flattened",
    label: "flattened home directory path",
    // How INS-29's Drive path reached a tracked file: agent tooling mangles
    // $HOME into a temp-dir slug (/private/tmp/claude-501/-Users-someone-...).
    regex:
      /[/-](?:Users|home)-[A-Za-z0-9._]+-(?:dev|Library|Documents|Desktop|src|git|code|projects?|work)[/-]/g,
    remedy:
      "Strip the temp-directory slug. It encodes the committer's home path.",
  },
  {
    id: "cloud-storage-account",
    label: "cloud storage account folder",
    regex: /CloudStorage\/(?:GoogleDrive|OneDrive|Dropbox|Box)-[^\s"'`)]*/g,
    remedy:
      "Cloud-storage folder names embed the account email. Reference the record, not the sync path.",
  },
  {
    id: "github-token",
    label: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    remedy: "Revoke the token immediately, then remove it from the change.",
  },
  {
    id: "aws-access-key-id",
    label: "AWS access key id",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    remedy: "Revoke the key immediately, then remove it from the change.",
  },
  {
    id: "private-key-block",
    label: "private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
    remedy: "Private keys never belong in the repo. Rotate the key.",
  },
  {
    id: "api-secret-key",
    label: "API secret key",
    regex: /\bsk-(?:ant-|proj-|live-)?[A-Za-z0-9_-]{24,}\b/g,
    remedy: "Revoke the key immediately, then remove it from the change.",
  },
  {
    id: "slack-token",
    label: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    remedy: "Revoke the token immediately, then remove it from the change.",
  },
  {
    id: "json-web-token",
    label: "JSON Web Token",
    // Supabase service-role and anon keys are JWTs.
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    remedy:
      "Move the key to an environment variable. Rotate it if it was a service-role key.",
  },
];

// Control A also covers file shapes that are local-only or secret-bearing by
// construction, whatever their content happens to be today.
export const FILENAME_RULES = [
  {
    id: "local-filename",
    label: "machine-local file",
    regex: /(?:^|\/)[^/]*\.local\.[^/]+$/,
    remedy:
      "`*.local.*` files hold per-machine state. Keep them untracked and gitignored.",
  },
  {
    id: "env-filename",
    label: "environment file",
    regex: /(?:^|\/)\.env(?:$|[.-])/,
    allowPath: /\.example$/,
    remedy: "Track only `.env*.example`. Real env files stay untracked.",
  },
  {
    id: "credential-filename",
    label: "credential file",
    regex:
      /(?:^|\/)(?:id_(?:rsa|dsa|ecdsa|ed25519)|[^/]+\.(?:pem|p12|pfx|jks|keystore|kdbx))$/,
    remedy: "Credential material never belongs in the repo.",
  },
];

// Control B. Directory name segments that mean "a human sent us this".
// Third-party personal information routes to the database behind the personnel
// gate, never to the repo. See docs/third-party-personal-data.md.
export const DENIED_PATH_SEGMENTS = [
  "volunteer-packets",
  "volunteers",
  "submissions",
  "applicants",
  "donors",
  "tips",
  "contact-forms",
];

const DENIED_PATH_REGEX = new RegExp(
  `(?:^|/)(?:${DENIED_PATH_SEGMENTS.join("|")})/`,
);

// Every entry is a deliberate, reviewed hole. Keep it short and dated, and
// state what still has to happen for the entry to go away.
export const ALLOWLIST = [
  {
    path: ".claude/settings.local.json",
    ruleId: "local-filename",
    reason:
      "Tracked since before INS-65 and inherited by every agent run. Interim disposition 2026-10-24: stays tracked, exempt from the filename rule only — content rules still apply, so the machine paths that caused INS-29 are still blocked. Permanent disposition (untrack + ship a shared .claude/settings.json) is escalated to the principal.",
  },
];

const isAllowed = (filePath, ruleId) =>
  ALLOWLIST.some((entry) => entry.path === filePath && entry.ruleId === ruleId);

const lineOf = (text, index) => {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) {
      line += 1;
    }
  }
  return line;
};

// Never echo the matched text: it may be a live credential or somebody's
// personal information, and CI logs are readable by anyone with repo access.
// Report the rule, the location, and the remedy — enough to fix it locally.
const redact = (match) => `${match.length} redacted characters`;

export const scanContent = (filePath, text) => {
  const findings = [];
  for (const rule of CONTENT_RULES) {
    if (isAllowed(filePath, rule.id)) {
      continue;
    }
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(text))) {
      if (rule.allowMatch?.test(match[0])) {
        continue;
      }
      findings.push({
        control: "A",
        file: filePath,
        line: lineOf(text, match.index),
        ruleId: rule.id,
        label: rule.label,
        detail: redact(match[0]),
        remedy: rule.remedy,
      });
    }
  }
  return findings;
};

export const scanFilename = (filePath) => {
  const findings = [];
  for (const rule of FILENAME_RULES) {
    if (isAllowed(filePath, rule.id) || rule.allowPath?.test(filePath)) {
      continue;
    }
    if (rule.regex.test(filePath)) {
      findings.push({
        control: "A",
        file: filePath,
        line: null,
        ruleId: rule.id,
        label: rule.label,
        detail: "tracked filename matches a local/secret-only shape",
        remedy: rule.remedy,
      });
    }
  }
  return findings;
};

export const scanSubmissionPath = (filePath) => {
  if (!DENIED_PATH_REGEX.test(filePath)) {
    return [];
  }
  return [
    {
      control: "B",
      file: filePath,
      line: null,
      ruleId: "third-party-submission-path",
      label: "third-party submission directory",
      detail: "path is under a denied human-submission directory",
      remedy:
        "Third-party personal information does not go in the repo. Route it through the intake path in docs/third-party-personal-data.md.",
    },
  ];
};

export const scanFile = ({ path: filePath, content }) => [
  ...scanSubmissionPath(filePath),
  ...scanFilename(filePath),
  ...(content === null ? [] : scanContent(filePath, content)),
];

const git = (args) => {
  const result = spawnSync("git", args, {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr?.toString("utf8").trim()}`,
    );
  }
  return result.stdout;
};

// -z output: NUL-separated, never quoted, so paths with spaces survive intact.
const gitPaths = (args) =>
  git([...args, "-z"])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);

// null content means "present, but not text we can scan" — the path rules
// still apply, the content rules cannot.
const asScannableText = (buffer) => {
  if (buffer.length > MAX_SCAN_BYTES || buffer.includes(0)) {
    return null;
  }
  return buffer.toString("utf8");
};

const readBlob = (revPath) =>
  asScannableText(git(["cat-file", "blob", revPath]));

const readWorkingTree = (filePath) => asScannableText(readFileSync(filePath));

const collectStaged = () =>
  gitPaths(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);

// Whole-file scan of every file the change touches, not just added lines. A
// pre-existing finding in a file you are already editing is yours to clean;
// "it was already there" is how the tree drifted dirty in the first place.
const collectRange = (base) => {
  const mergeBase = git(["merge-base", base, "HEAD"]).toString("utf8").trim();
  return gitPaths([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    mergeBase,
    "HEAD",
  ]);
};

const main = () => {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "--tracked";
  let files;
  // Diff modes read the recorded object, because what matters there is what
  // the commit actually carries. Tree modes read the working tree, because
  // what matters there is what you are about to commit.
  let read;

  switch (mode) {
    case "--staged":
      files = collectStaged();
      read = (filePath) => readBlob(`:${filePath}`);
      break;
    case "--base": {
      const base = args[1];
      if (!base) {
        throw new Error("--base requires a ref");
      }
      files = collectRange(base);
      read = (filePath) => readBlob(`HEAD:${filePath}`);
      break;
    }
    case "--tracked":
      files = gitPaths(["ls-files"]);
      read = readWorkingTree;
      break;
    case "--files":
      files = args.slice(1);
      read = readWorkingTree;
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }

  const findings = files.flatMap((filePath) => {
    let content;
    try {
      content = read(filePath);
    } catch {
      // Deleted or renamed away; nothing to read.
      return [];
    }
    return scanFile({ content, path: filePath });
  });

  if (findings.length === 0) {
    console.log(
      `Personal-data scan: ${files.length} file(s) checked, 0 findings.`,
    );
    return;
  }

  console.error(
    `Personal-data scan FAILED: ${findings.length} finding(s) across ${files.length} file(s) checked.`,
  );
  for (const finding of findings) {
    const where = finding.line
      ? `${finding.file}:${finding.line}`
      : finding.file;
    console.error(
      `\n- [Control ${finding.control}/${finding.ruleId}] ${where}`,
    );
    console.error(`  ${finding.label}: ${finding.detail}`);
    console.error(`  ${finding.remedy}`);
  }
  console.error(
    "\nSee docs/third-party-personal-data.md. Do not bypass this gate; if a finding is wrong, add a reviewed ALLOWLIST entry in scripts/scan-personal-data.mjs.",
  );
  process.exitCode = 1;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
