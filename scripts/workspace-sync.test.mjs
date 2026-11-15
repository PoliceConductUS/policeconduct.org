import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const helper = resolve("scripts/workspace-sync.sh");
function run(decision, stage = "after", extra = {}) {
  const root = mkdtempSync(join(tmpdir(), "workspace-decision-"));
  try {
    const log = join(root, "calls");
    const cli = join(root, "node");
    writeFileSync(
      cli,
      '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\nexit "${SYNC_EXIT:-0}"\n',
      { mode: 0o755 },
    );
    const result = spawnSync("bash", [helper, stage, "preview"], {
      encoding: "utf8",
      timeout: 3000,
      env: {
        ...process.env,
        BASH_ENV: "",
        WORKSPACE_SYNC: decision,
        PATH: `${root}:${process.env.PATH}`,
        INTAKE_WORKSPACE: root,
        INTAKE_WORKSPACE_BUCKET: "fixture-workspaces",
        CALL_LOG: log,
        ...extra,
      },
    });
    let calls = "";
    try {
      calls = readFileSync(log, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return { ...result, calls };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("skip preserves hosting success without workspace invocation", () => {
  const r = run("skip");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.calls, "");
});
test("accepted preview decision uploads only preview workspace", () => {
  const r = run("upload");
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.calls,
    /intake-workspace-sync.mjs sync --direction upload --bucket fixture-workspaces/,
  );
});
test("noninteractive missing decision fails immediately without stdin", () => {
  const r = run("", "preflight");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /WORKSPACE_SYNC/);
  assert.equal(r.calls, "");
});
test("invalid decision fails before upload", () => {
  const r = run("yes", "preflight");
  assert.notEqual(r.status, 0);
  assert.equal(r.calls, "");
});
test("preflight validates accepted configuration without transferring", () => {
  const r = run("upload", "preflight");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.calls, "");
});
test("workspace failure is visible and identifies hosting success", () => {
  const r = run("upload", "after", { SYNC_EXIT: "41" });
  assert.equal(r.status, 41, r.stderr);
  assert.match(r.stderr, /Hosting upload succeeded/);
});

for (const answer of ["n", "y"])
  test(`interactive ${answer} uses a real terminal and respects the choice`, () => {
    const root = mkdtempSync(join(tmpdir(), "workspace-prompt-"));
    try {
      writeFileSync(
        join(root, "node"),
        '#!/bin/sh\necho "fixture transfer: $*"\n',
        { mode: 0o755 },
      );
      const python = `import os,pty,subprocess,select,sys\nmaster,slave=pty.openpty()\np=subprocess.Popen(['bash',sys.argv[1],'after','production'],stdin=slave,stdout=slave,stderr=slave,close_fds=True)\nos.close(slave)\nout=b''\nsent=False\nwhile True:\n ready,_,_=select.select([master],[],[],3)\n if not ready: p.kill(); raise RuntimeError('prompt timed out')\n try: chunk=os.read(master,65536)\n except OSError: break\n if not chunk: break\n out+=chunk\n if b'[y/N]' in out and not sent: os.write(master,(sys.argv[2]+'\\n').encode());sent=True\np.wait(timeout=3)\nsys.stdout.buffer.write(out)\nsys.exit(p.returncode)\n`;
      const result = spawnSync("python3", ["-c", python, helper, answer], {
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          BASH_ENV: "",
          PATH: `${root}:${process.env.PATH}`,
          WORKSPACE_SYNC: "",
          INTAKE_WORKSPACE: root,
          INTAKE_WORKSPACE_BUCKET: "fixture-workspaces",
        },
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Upload workspace /);
      if (answer === "y")
        assert.match(
          result.stdout,
          /fixture transfer: .*intake-workspace-sync.mjs sync --direction upload/,
        );
      else assert.doesNotMatch(result.stdout, /fixture transfer:/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
