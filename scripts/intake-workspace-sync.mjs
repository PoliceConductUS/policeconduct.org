import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline";
function intakeWorkspace(env) {
  if (!env.INTAKE_WORKSPACE?.trim())
    throw Error("INTAKE_WORKSPACE must name an existing directory");
  return env.INTAKE_WORKSPACE;
}
const exec = promisify(execFile);
async function awsCli(args) {
  if (args[0] === "s3") {
    return new Promise((resolve, reject) => {
      const child = spawn("aws", [...args, "--no-cli-pager"], {
        stdio: ["ignore", "pipe", "inherit"],
      });
      child.stdout.on("data", (chunk) => process.stdout.write(chunk));
      let count = 0;
      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => {
        if (/^(?:\(dryrun\) )?(?:upload|download): /.test(line)) count++;
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve(count)
          : reject(
              new Error(
                `AWS transfer failed (${code}); destination may be partial`,
              ),
            ),
      );
    });
  }
  const result = await exec("aws", [...args, "--no-cli-pager"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  return result.stdout;
}
function relativeKey(key) {
  if (
    !key ||
    key.includes("\\") ||
    [...key].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    key.split("/").some((p) => !p || p === "." || p === ".." || p.includes(":"))
  )
    throw new Error(`Unsafe workspace key: ${JSON.stringify(key)}`);
  return key;
}
async function validateWorkspace(env) {
  const root = path.resolve(intakeWorkspace(env));
  if (root === path.parse(root).root || root === os.homedir())
    throw Error("Workspace cannot be the filesystem root or home directory");
  // Check every component: realpath alone cannot distinguish an explicitly selected symlink.
  for (
    let current = root;
    current !== path.dirname(current);
    current = path.dirname(current)
  ) {
    if ((await lstat(current)).isSymbolicLink()) {
      // System aliases such as /var -> /private/var are safe only above the selected workspace.
      if (current === root) throw Error("Workspace root must not be a symlink");
    }
  }
  if (!(await lstat(root)).isDirectory())
    throw Error("INTAKE_WORKSPACE must be an existing directory");
  return realpath(root);
}
export async function runWorkspace(options, dependencies = {}) {
  const log = [];
  const report = (message) => {
    if (dependencies.onProgress) dependencies.onProgress(message + "\n");
    else log.push(message);
  };
  let completed = 0;
  try {
    if (options.environment !== undefined)
      throw Error(
        "Environment arguments are unsupported; INTAKE_WORKSPACE selects the full workspace",
      );
    if (
      typeof options.bucket !== "string" ||
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(options.bucket)
    )
      throw Error("bucket must be a plain S3 bucket name without a path");
    if (!["sync", "versions", "restore"].includes(options.operation))
      throw Error("Invalid workspace operation");
    if (
      options.operation === "sync" &&
      !["upload", "download"].includes(options.direction ?? "")
    )
      throw Error("direction must be upload or download");
    if (options.operation !== "sync") relativeKey(options.key ?? "");
    if (
      options.operation === "restore" &&
      (!options.versionId ||
        options.versionId === "null" ||
        [...options.versionId].some(
          (character) => character.charCodeAt(0) < 32,
        ))
    )
      throw Error("An explicit non-null version ID is required");
    const root = await validateWorkspace(dependencies.env ?? process.env);
    const aws = dependencies.aws ?? awsCli;
    const prefix = `${relativeKey(path.basename(root))}/`;
    const remote = `s3://${options.bucket}/${prefix}`;
    if (options.operation !== "versions") {
      report(
        `${options.dryRun ? "DRY RUN " : ""}${options.operation === "sync" ? options.direction : options.operation}: ${options.direction === "download" ? remote + " -> " + root : root + " -> " + remote}`,
      );
      report("Validating workspace storage...");
    }
    const bucket = ["--bucket", options.bucket];
    const versioning = JSON.parse(
      await aws([
        "s3api",
        "get-bucket-versioning",
        ...bucket,
        "--output",
        "json",
      ]),
    );
    if (versioning.Status !== "Enabled")
      throw Error("Workspace bucket versioning must be Enabled");
    const tags = JSON.parse(
      await aws(["s3api", "get-bucket-tagging", ...bucket, "--output", "json"]),
    );
    if (
      !tags.TagSet?.some(
        (t) => t.Key === "Purpose" && t.Value === "intake-workspace",
      )
    )
      throw Error(
        "Bucket is not tagged Purpose=intake-workspace; refusing possible hosting bucket",
      );
    if (options.operation === "versions") {
      const response = JSON.parse(
        await aws([
          "s3api",
          "list-object-versions",
          ...bucket,
          "--prefix",
          prefix + options.key,
          "--output",
          "json",
        ]),
      );
      return {
        exitCode: 0,
        stdout:
          JSON.stringify(
            {
              Versions: (response.Versions ?? []).filter(
                (v) => v.Key === prefix + options.key,
              ),
              DeleteMarkers: (response.DeleteMarkers ?? []).filter(
                (v) => v.Key === prefix + options.key,
              ),
            },
            null,
            2,
          ) + "\n",
      };
    }
    let keys;
    if (options.operation === "restore") keys = [options.key];
    else if (options.direction === "upload") keys = [];
    else {
      report("Validating remote paths before download...");
      keys = [];
      let token;
      do {
        const response = JSON.parse(
          await aws([
            "s3api",
            "list-objects-v2",
            ...bucket,
            "--prefix",
            prefix,
            "--max-keys",
            "1000",
            "--no-paginate",
            "--output",
            "json",
            ...(token ? ["--continuation-token", token] : []),
          ]),
        );
        for (const item of response.Contents ?? []) {
          if (typeof item.Key !== "string" || !item.Key.startsWith(prefix))
            throw Error("S3 returned a key outside the selected environment");
          const key = relativeKey(item.Key.slice(prefix.length));
          if (path.posix.basename(key) !== ".DS_Store") keys.push(key);
        }
        if (
          response.IsTruncated &&
          (!response.NextContinuationToken ||
            response.NextContinuationToken === token)
        )
          throw Error("S3 pagination did not advance");
        token = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (token);
    }
    // Preflight all destination components before creating backups or transferring bytes.
    const downloading =
      options.operation === "restore" || options.direction === "download";
    const sortedKeys = [...keys].sort();
    if (downloading)
      for (let index = 0; index < sortedKeys.length; index++) {
        const key = sortedKeys[index];
        const parts = key.split("/");
        let current = root;
        for (let i = 0; i < parts.length; i++) {
          current = path.join(current, parts[i]);
          const st = await lstat(current).catch((e) => {
            if (e.code === "ENOENT") return undefined;
            throw e;
          });
          if (
            st &&
            (st.isSymbolicLink() ||
              (i < parts.length - 1 ? !st.isDirectory() : !st.isFile()))
          )
            throw Error(`Unsafe destination: ${key}`);
        }
        if (sortedKeys[index + 1]?.startsWith(`${key}/`))
          throw Error(`Conflicting remote paths: ${key}`);
      }
    if (downloading && keys.length && !options.dryRun) {
      const backup = path.join(
        await mkdtemp(
          path.join(path.dirname(root), `${path.basename(root)}.backup-`),
        ),
        "workspace",
      );
      report(`Backup: ${backup}`);
      report("Backing up local workspace before download...");
      await cp(root, backup, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    }
    if (options.operation === "sync") {
      const remote = `s3://${options.bucket}/${prefix}`;
      report(
        "Syncing workspace; unchanged files may be skipped; destination-only files retained.",
      );
      completed = await aws([
        "s3",
        "sync",
        ...(downloading
          ? [remote, root + path.sep]
          : [root + path.sep, remote]),
        "--no-follow-symlinks",
        "--exclude",
        ".DS_Store",
        "--exclude",
        "*/.DS_Store",
        ...(options.dryRun ? ["--dryrun"] : []),
        ...(!downloading ? ["--sse", "AES256"] : []),
      ]);
    } else if (!options.dryRun && options.operation === "restore") {
      const key = options.key;
      report(`Restore: ${key}`);
      {
        // Download into a separate temporary directory; replace only after successful completion.
        const temp = await mkdtemp(
          path.join(path.dirname(root), ".workspace-download-"),
        );
        try {
          await aws([
            "s3api",
            "get-object",
            ...bucket,
            "--key",
            prefix + key,
            ...(options.operation === "restore"
              ? ["--version-id", options.versionId]
              : []),
            "--output",
            "json",
            path.join(temp, "object"),
          ]);
          await mkdir(path.dirname(path.join(root, key)), { recursive: true });
          await rename(path.join(temp, "object"), path.join(root, key));
        } finally {
          await rm(temp, { recursive: true, force: true });
        }
      }
      completed++;
    }
    report(
      `${options.operation === "restore" && options.dryRun ? keys.length : completed} files ${options.dryRun ? "planned" : "transferred"}; destination-only files retained.`,
    );
    return { exitCode: 0, stdout: log.join("\n") + "\n" };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: log.length ? log.join("\n") + "\n" : undefined,
      stderr: `Workspace operation failed (completed batch: ${completed} files; failed batch may be partial): ${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
}

import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
export async function main(args, dependencies = {}) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      bucket: { type: "string" },
      direction: { type: "string" },
      key: { type: "string" },
      "version-id": { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });
  if (positionals.length !== 1)
    throw Error(
      "Usage: node scripts/intake-workspace-sync.mjs sync|versions|restore --bucket BUCKET [--direction upload|download] [--key KEY --version-id ID] [--dry-run]",
    );
  return runWorkspace(
    {
      ...values,
      operation: positionals[0],
      versionId: values["version-id"],
      dryRun: values["dry-run"],
    },
    dependencies,
  );
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await main(process.argv.slice(2), {
      onProgress: (text) => process.stdout.write(text),
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
