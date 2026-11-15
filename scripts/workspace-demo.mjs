/** Local non-sensitive fixture demonstration. Never contacts AWS or a database. */
import { createServer } from "node:http";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runWorkspace } from "./intake-workspace-sync.mjs";
async function demonstrate() {
  const root = await mkdtemp(path.join(os.tmpdir(), "intake-sync-demo-"));
  const workspace = path.join(root, "workspace");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(workspace);
  const file = path.join(workspace, "evidence.txt");
  const revisions = [];
  const aws = async (args) => {
    if (args[1] === "get-bucket-versioning") return '{"Status":"Enabled"}';
    if (args[1] === "get-bucket-tagging")
      return '{"TagSet":[{"Key":"Purpose","Value":"intake-workspace"}]}';
    if (args[1] === "sync") {
      revisions.push(
        await readFile(path.join(args[2], "evidence.txt"), "utf8"),
      );
      return 1;
    }
    if (args[1] === "get-object") {
      await writeFile(
        args.at(-1),
        revisions[Number(args[args.indexOf("--version-id") + 1])],
      );
      return "{}";
    }
    throw Error("Unexpected fixture operation");
  };
  const dependencies = { env: { INTAKE_WORKSPACE: workspace }, aws };
  const common = {
    bucket: "fixture-intake-workspaces",
  };
  try {
    await writeFile(file, "original non-sensitive evidence\n");
    const first = await runWorkspace(
      { ...common, operation: "sync", direction: "upload" },
      dependencies,
    );
    await writeFile(file, "revised non-sensitive evidence\n");
    const second = await runWorkspace(
      { ...common, operation: "sync", direction: "upload" },
      dependencies,
    );
    const restore = await runWorkspace(
      { ...common, operation: "restore", key: "evidence.txt", versionId: "0" },
      dependencies,
    );
    for (const result of [first, second, restore])
      if (result.exitCode) throw Error(result.stderr);
    return {
      storage: "In-memory S3 fixture; no AWS or database access",
      prefix: "workspace/",
      uploads: 2,
      retainedVersions: revisions,
      recoveredBytes: await readFile(file, "utf8"),
      backupCreated: restore.stdout.includes("Backup:"),
      passed: (await readFile(file, "utf8")) === revisions[0],
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const html =
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Workspace recovery fixture</title><h1>Workspace recovery fixture</h1><p>Runs the real intake transfer code with synthetic evidence and in-memory S3 versions. No cloud or database writes.</p><button id="run">Run upload, overwrite and recovery</button><pre id="result"></pre><script>document.querySelector("#run").onclick=async()=>{document.querySelector("#result").textContent="Running…";const response=await fetch("/run",{method:"POST"});document.querySelector("#result").textContent=JSON.stringify(await response.json(),null,2);};</script></html>';
createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  if (req.method === "POST" && req.url === "/run") {
    try {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(await demonstrate()));
    } catch (error) {
      res.end(JSON.stringify({ error: String(error) }));
    }
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(8154, "127.0.0.1", () =>
  process.stdout.write("Fixture demo: http://127.0.0.1:8154\n"),
);
