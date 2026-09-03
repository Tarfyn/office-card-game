import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = 5432;
const database = "office_card_game_test_accounts";
const user = "ocg_test";
const password = "ocg_disposable_test_only_7c6e86e4";
const image = "postgres:18";
const container = `ocg-pg18-test-${process.pid}-${Date.now()}`;
const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let started = false;

function docker(args, options = {}) {
  const result = spawnSync("docker", args, { encoding:"utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0 && options.allowFailure !== true) {
    throw new Error(`Docker command failed (${args[0]}): ${String(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

async function requireFreeLoopbackPort() {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", () => reject(new Error(`${host}:${port} is already in use; disposable PostgreSQL was not started`)));
    server.listen({ host, port, exclusive:true }, () => server.close(resolve));
  });
}

function cleanup() {
  if (!started) return;
  docker(["stop", container], { stdio:"ignore", allowFailure:true });
  started = false;
}

for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => {
    cleanup();
    process.exit(exitCode);
  });
}

try {
  await requireFreeLoopbackPort();
  docker(["version", "--format", "{{.Server.Version}} {{.Server.Os}}/{{.Server.Arch}}"]);
  docker([
    "run", "--rm", "--detach", "--name", container,
    "--publish", `${host}:${port}:5432`,
    "--env", `POSTGRES_USER=${user}`,
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", `POSTGRES_DB=${database}`,
    "--health-cmd", `pg_isready -U ${user} -d ${database}`,
    "--health-interval", "1s", "--health-timeout", "3s", "--health-retries", "30",
    image
  ], { stdio:"ignore" });
  started = true;

  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = docker(["inspect", "--format", "{{.State.Health.Status}}", container], { allowFailure:true });
    if (status.status === 0 && status.stdout.trim() === "healthy") {
      healthy = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!healthy) throw new Error("Disposable PostgreSQL 18 did not become healthy");

  const build = spawnSync(process.execPath, [join(repositoryRoot, "scripts", "build.mjs")], {
    cwd:repositoryRoot,
    stdio:"inherit",
    shell:false
  });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error(`Database test build failed with status ${build.status}`);

  const testEnvironment = { ...process.env, OCG_TEST_DATABASE_URL:databaseUrl };
  delete testEnvironment.DATABASE_URL;
  const test = spawnSync(process.execPath, [join(repositoryRoot, "scripts", "db-integration-test.mjs")], {
    cwd:repositoryRoot,
    env:testEnvironment,
    stdio:"inherit",
    shell:false
  });
  if (test.error) throw test.error;
  if (test.status !== 0) process.exitCode = test.status ?? 1;
} finally {
  cleanup();
}
