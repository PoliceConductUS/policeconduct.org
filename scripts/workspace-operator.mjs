import { execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWorkspace } from "./intake-workspace-sync.mjs";
const exec = promisify(execFile);
// Absolute, so the command works from any working directory.
const terraformDir = fileURLToPath(
  new URL("../infrastructure/intake-workspace", import.meta.url),
);
export async function operator(args, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const run = dependencies.exec ?? exec;
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { "dry-run": { type: "boolean" } },
  });
  const [operation] = positionals;
  if (!["push", "pull"].includes(operation) || positionals.length !== 1)
    throw Error("Use npm run workspace:push|pull -- [--dry-run]");
  const report = dependencies.onProgress;
  report?.(
    `Workspace ${operation}: resolving storage and validating configuration...\n`,
  );
  const bucket =
    env.INTAKE_WORKSPACE_BUCKET?.trim() ||
    (
      await run("terraform", [
        `-chdir=${terraformDir}`,
        "output",
        "-raw",
        "intake_workspace_bucket_name",
      ])
    ).stdout.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))
    throw Error(
      "Missing or invalid workspace bucket; set INTAKE_WORKSPACE_BUCKET or initialize the existing Terraform state.",
    );
  const aws = async (action) =>
    JSON.parse(
      (
        await run("aws", [
          "s3api",
          action,
          "--bucket",
          bucket,
          "--output",
          "json",
          "--no-cli-pager",
        ])
      ).stdout,
    );
  // runWorkspace checks versioning and the Purpose tag itself.
  const access = (await aws("get-public-access-block"))
    .PublicAccessBlockConfiguration;
  if (
    ![
      "BlockPublicAcls",
      "IgnorePublicAcls",
      "BlockPublicPolicy",
      "RestrictPublicBuckets",
    ].every((k) => access?.[k] === true)
  )
    throw Error("All four bucket public-access blocks must be enabled");
  const rules = (await aws("get-bucket-encryption"))
    .ServerSideEncryptionConfiguration?.Rules;
  if (
    !rules?.length ||
    !rules.every(
      (r) => r.ApplyServerSideEncryptionByDefault?.SSEAlgorithm === "AES256",
    )
  )
    throw Error("Bucket default encryption must be AES256");
  const summary = `Storage validation passed: ${bucket}; public access blocked; AES256 encryption.\n`;
  report?.(summary);
  const result = await (dependencies.workspace ?? runWorkspace)(
    {
      operation: "sync",
      direction: operation === "push" ? "upload" : "download",
      bucket,
      dryRun: values["dry-run"],
      summaryOnly: true,
    },
    { env, onProgress: report },
  );
  return { ...result, stdout: (report ? "" : summary) + (result.stdout ?? "") };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await operator(process.argv.slice(2), {
      onProgress: (text) => process.stdout.write(text),
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(`Workspace command failed: ${error.message}`);
    process.exitCode = 1;
  }
}
