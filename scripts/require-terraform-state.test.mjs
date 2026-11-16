import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard = resolve("scripts/require-terraform-state.sh");
const cases = [
  ["empty resources", '{"version":4,"resources":[]}', 0, false],
  [
    "data only",
    '{"version":4,"resources":[{"mode":"data","instances":[{}]}]}',
    0,
    false,
  ],
  [
    "no instances",
    '{"version":4,"resources":[{"mode":"managed","instances":[]}]}',
    0,
    false,
  ],
  ["malformed state", "not json", 0, false],
  ["unreadable backend", "", 1, false],
  [
    "partial output then error",
    '{"version":4,"resources":[{"mode":"managed","instances":[{}]}]}',
    1,
    false,
  ],
  [
    "managed instance",
    '{"version":4,"resources":[{"mode":"managed","instances":[{}]}]}',
    0,
    true,
  ],
];

function fixture(t, state, exitCode) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "terraform-guard-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "terraform"),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$CALL_LOG"\nprintf "%s" "$TEST_STATE"\nexit "$TEST_EXIT"\n',
    { mode: 0o755 },
  );
  return {
    dir,
    env: {
      ...process.env,
      BASH_ENV: "/dev/null",
      PATH: `${bin}:${process.env.PATH}`,
      TEST_STATE: state,
      TEST_EXIT: String(exitCode),
      CALL_LOG: join(dir, "calls"),
    },
  };
}

for (const [name, state, exitCode, allowed] of cases) {
  test(name, (t) => {
    const { dir, env } = fixture(t, state, exitCode);
    const result = spawnSync("bash", [guard, dir], { env, encoding: "utf8" });
    assert.equal(result.status, allowed ? 0 : 1, result.stderr);
    assert.equal(
      result.stderr.includes("required to verify"),
      false,
      result.stderr,
    );
    assert.equal(
      readFileSync(env.CALL_LOG, "utf8"),
      `-chdir=${dir} state pull\n`,
    );
  });
}

for (const stack of ["policeconduct", "iceconduct", "recaptcha"]) {
  for (const phase of ["full", "foundation"]) {
    test(`${stack} ${phase} refuses empty state before any other command`, (t) => {
      const { dir, env } = fixture(t, '{"version":4,"resources":[]}', 0);
      const stackDir = join(dir, "infrastructure", `bootstrap-${stack}`);
      mkdirSync(join(stackDir, "scripts"), { recursive: true });
      mkdirSync(join(dir, "scripts"));
      cpSync(guard, join(dir, "scripts", "require-terraform-state.sh"));
      const wrapper = join(stackDir, "scripts", "apply.sh");
      cpSync(`infrastructure/bootstrap-${stack}/scripts/apply.sh`, wrapper);
      writeFileSync(join(dir, ".env"), "exit 99\n");
      const result = spawnSync("bash", [wrapper, "-auto-approve"], {
        env: { ...env, PHASE: phase },
        encoding: "utf8",
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /refusing apply/);
      assert.equal(
        result.stderr.includes("required to verify"),
        false,
        result.stderr,
      );
      assert.equal(
        readFileSync(env.CALL_LOG, "utf8"),
        `-chdir=${stackDir} state pull\n`,
      );
    });
  }
}

const managedState =
  '{"version":4,"resources":[{"mode":"managed","instances":[{}]}]}';

test("an uninitialized stack directory is named as the cause", (t) => {
  const { dir, env } = fixture(t, "", 1);
  const result = spawnSync("bash", [guard, dir], { env, encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /refusing apply/);
  assert.match(result.stderr, /has not been initialized/);
  assert.ok(result.stderr.includes(`terraform -chdir="${dir}" init`));

  mkdirSync(join(dir, ".terraform"));
  writeFileSync(join(dir, ".terraform", "terraform.tfstate"), "{}");
  const initialized = spawnSync("bash", [guard, dir], {
    env,
    encoding: "utf8",
  });
  assert.equal(initialized.status, 1, initialized.stderr);
  assert.equal(initialized.stderr.includes("has not been initialized"), false);
});

for (const stack of ["policeconduct", "recaptcha"]) {
  test(`${stack} refuses to plan against variable defaults when terraform.tfvars is missing`, (t) => {
    const { dir, env } = fixture(t, managedState, 0);
    const stackDir = join(dir, "infrastructure", `bootstrap-${stack}`);
    mkdirSync(join(stackDir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "scripts"));
    cpSync(guard, join(dir, "scripts", "require-terraform-state.sh"));
    cpSync(
      "scripts/require-terraform-var-file.sh",
      join(dir, "scripts", "require-terraform-var-file.sh"),
    );
    const wrapper = join(stackDir, "scripts", "apply.sh");
    cpSync(`infrastructure/bootstrap-${stack}/scripts/apply.sh`, wrapper);
    writeFileSync(join(dir, ".env"), "exit 99\n");
    const result = spawnSync("bash", [wrapper, "-auto-approve"], {
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /terraform\.tfvars is missing/);
    assert.equal(
      readFileSync(env.CALL_LOG, "utf8"),
      `-chdir=${stackDir} state pull\n`,
    );
  });
}
