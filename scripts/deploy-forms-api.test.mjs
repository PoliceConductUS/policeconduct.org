import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  copyFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

for (const scenario of ["match", "mismatch", "read-failure", "unknown"]) {
  test(`forms release configuration ownership: ${scenario}`, async () => {
    const dir = await mkdtemp(join(resolve(tmpdir()), "forms-release-"));
    try {
      const bin = join(dir, "bin");
      const scripts = join(dir, "scripts");
      const source = join(dir, "lambdas/forms-api");
      await Promise.all([
        mkdir(bin),
        mkdir(scripts),
        mkdir(source, { recursive: true }),
      ]);
      await copyFile(
        "infrastructure/bootstrap-policeconduct/scripts/deploy-forms-api.sh",
        join(scripts, "deploy.sh"),
      );
      await writeFile(
        join(source, "index.mjs"),
        "export const handler = () => {};\n",
      );
      const log = join(dir, "calls");
      await writeFile(
        join(bin, "aws"),
        `#!/bin/bash
printf '%s\n' "$*" >> "$CALL_LOG"
case "$1 $2" in
  'sts get-caller-identity') echo 942370948729 ;;
  'sns get-topic-attributes') echo '{}' ;;
  'sns list-subscriptions-by-topic') echo '{"Subscriptions":[{"SubscriptionArn":"arn:fixture"}]}' ;;
  'lambda get-function-configuration')
    [[ "$SCENARIO" != read-failure ]] || exit 1
    label=""; [[ "$*" != *preview* ]] || label=preview
    recipients=staff@example.test
    if [[ "$SCENARIO" == mismatch && "$*" == *prod* ]]; then recipients=other@example.test; fi
    printf '{"topic":"arn:aws:sns:us-east-1:942370948729:fixture","recipients":"%s","label":"%s"}\n' "$recipients" "$label" ;;
  'lambda publish-version') echo 1 ;;
  'lambda update-function-code'|'lambda wait') echo ok ;;
  *) exit 99 ;;
esac
`,
        { mode: 0o755 },
      );
      await writeFile(join(bin, "npm"), "#!/bin/bash\nexit 0\n", {
        mode: 0o755,
      });
      await writeFile(join(bin, "zip"), '#!/bin/bash\ntouch "$4"\n', {
        mode: 0o755,
      });
      const args = [
        join(scripts, "deploy.sh"),
        "--apply",
        "--topic-arn",
        "arn:aws:sns:us-east-1:942370948729:fixture",
        "--recipients",
        "staff@example.test",
      ];
      if (scenario === "unknown") args.push("--only", "unmanaged-function");
      const result = spawnSync("bash", args, {
        encoding: "utf8",
        env: {
          ...process.env,
          BASH_ENV: "/dev/null",
          PATH: `${bin}:${process.env.PATH}`,
          CALL_LOG: log,
          SCENARIO: scenario,
        },
      });
      const calls = await readFile(log, "utf8").catch(() => {
        throw new Error(result.stderr + result.stdout);
      });
      assert.doesNotMatch(calls, /update-function-configuration/);
      if (scenario === "match") {
        assert.equal(result.status, 0, result.stderr);
        assert.equal(
          (calls.match(/lambda update-function-code/g) || []).length,
          2,
        );
      } else {
        assert.notEqual(result.status, 0);
        assert.doesNotMatch(calls, /publish-version|update-function-code/);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
