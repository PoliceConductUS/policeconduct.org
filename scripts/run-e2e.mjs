import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = "4321";
const baseUrl = `http://${host}:${port}`;
const timeoutMs = 120_000;

const env = { ...process.env };
delete env.FORCE_COLOR;
delete env.NO_COLOR;

const ansiEscapePattern = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`,
  "g",
);
const devServerLog = [];
const maxDevServerLogLines = 500;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { method: "HEAD" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return;
    }

    await wait(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    env,
    stdio: "inherit",
    ...options,
  });
}

function stripAnsi(value) {
  return value.replace(ansiEscapePattern, "");
}

function rememberDevServerLine(line) {
  devServerLog.push(line);

  if (devServerLog.length > maxDevServerLogLines) {
    devServerLog.shift();
  }
}

function isRoutineRequestLog(line) {
  const plainLine = stripAnsi(line);
  return /^\d{2}:\d{2}:\d{2} \[(?:200|204|301|302|304)\] /.test(plainLine);
}

function shouldPrintDevServerLine(line) {
  return !isRoutineRequestLog(line);
}

function collectDevServerStream(stream, write) {
  let partial = "";

  stream.on("data", (chunk) => {
    partial += chunk.toString();

    const lines = partial.split(/\r?\n/);
    partial = lines.pop() || "";

    for (const line of lines) {
      rememberDevServerLine(line);

      if (shouldPrintDevServerLine(line)) {
        write(`${line}\n`);
      }
    }
  });

  stream.on("end", () => {
    if (partial.length === 0) {
      return;
    }

    rememberDevServerLine(partial);

    if (shouldPrintDevServerLine(partial)) {
      write(`${partial}\n`);
    }
  });
}

function printDevServerLog() {
  if (devServerLog.length === 0) {
    return;
  }

  console.error("\nRecent dev-server output:");
  for (const line of devServerLog) {
    console.error(line);
  }
}

const hadExistingServer = await isServerReady();
const devServer = hadExistingServer
  ? null
  : spawnProcess(
      "mise",
      ["exec", "--", "node", "scripts/dev.mjs", "--host", host, "--port", port],
      {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

let shuttingDown = false;
const devServerExit = devServer
  ? new Promise((resolve) => {
      devServer.once("exit", (code, signal) => resolve({ code, signal }));
    })
  : Promise.resolve({ code: 0, signal: null });

async function stopDevServer() {
  if (!devServer || shuttingDown) {
    return;
  }

  shuttingDown = true;
  try {
    process.kill(-devServer.pid, "SIGTERM");
  } catch {
    devServer.kill("SIGTERM");
  }

  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), 5_000);
  });

  const result = await Promise.race([devServerExit, timeout]);
  if (result) {
    return;
  }

  try {
    process.kill(-devServer.pid, "SIGKILL");
  } catch {
    devServer.kill("SIGKILL");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void stopDevServer();
    process.kill(process.pid, signal);
  });
}

if (devServer) {
  collectDevServerStream(devServer.stdout, (line) =>
    process.stdout.write(line),
  );
  collectDevServerStream(devServer.stderr, (line) =>
    process.stderr.write(line),
  );

  devServerExit.then(({ code, signal }) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Dev server exited with ${signal || code}`);
      printDevServerLog();
      process.exit(code || 1);
    }
  });
}

try {
  await waitForServer();

  const playwright = spawnProcess(
    "mise",
    [
      "exec",
      "--",
      "node",
      "node_modules/playwright/cli.js",
      "test",
      ...process.argv.slice(2),
    ],
    {
      env: {
        ...env,
        PLAYWRIGHT_SKIP_WEB_SERVER: "1",
      },
    },
  );

  const exitCode = await new Promise((resolve) => {
    playwright.once("exit", (code, signal) => {
      if (signal) {
        console.error(`Playwright exited with ${signal}`);
      }

      resolve(code || 0);
    });
  });

  if (exitCode !== 0) {
    printDevServerLog();
  }

  process.exitCode = exitCode;
} finally {
  await stopDevServer();
}
