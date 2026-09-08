import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const source = (await readFile(join(root, "ops", "deploy.sh"), "utf8")).replace(/\r\n/g, "\n");

const main = source.slice(source.indexOf("main() {"));
assert.ok(main.indexOf("parse_target \"$@\"") < main.indexOf("acquire_lock"), "CLI parsing must precede lock acquisition");
assert.ok(main.indexOf("acquire_lock") < main.indexOf("validate_target"), "lock must precede target preparation");
const validate = source.slice(source.indexOf("validate_target() {"), source.indexOf("acquire_lock() {"));
assert.match(validate, /git fetch --tags origin/);
assert.match(validate, /git checkout --detach/);
assert.match(validate, /git reset --hard/);
assert.match(source, /flock -n 9/);
assert.match(source, /no shared checkout mutation performed/);
assert.match(source, /TARGET_VERSION/);
assert.match(source, /local and remote tag identities differ/);
assert.match(source, /checked out target changed before project validation/);
assert.match(source, /target commit changed before activation/);
assert.match(source, /umask 0022/);
assert.match(source, /normalize_postgres_release_modes/);

function validateIdentity({ tag, packageVersion, head, resolved }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) return false;
  if (resolved !== head) return false;
  return packageVersion === tag.slice(1);
}
assert.equal(validateIdentity({ tag: "v7.69.77", packageVersion: "7.69.77", head: "A", resolved: "A" }), true);
assert.equal(validateIdentity({ tag: "v7.69.99", packageVersion: "7.69.98", head: "A", resolved: "A" }), false);
assert.equal(validateIdentity({ tag: "v7.69.77", packageVersion: "7.69.77", head: "B", resolved: "A" }), false);
assert.equal(validateIdentity({ tag: "unknown", packageVersion: "7.69.77", head: "A", resolved: "A" }), false);
assert.equal(validateIdentity({ tag: "v7.69.77;rm", packageVersion: "7.69.77", head: "A", resolved: "A" }), false);

const fixture = String.raw`import { open, appendFile, rm } from "node:fs/promises";
const lock = process.env.LOCK_FILE;
const log = process.env.EVENT_LOG;
const mode = process.argv[2];
const role = process.argv[3];
const hold = Number(process.env.HOLD_MS || 0);
const fail = process.env.FAIL_OWNER === "1";
let handle;
try {
  handle = await open(lock, "wx");
} catch {
  await appendFile(log, mode + ":" + role + ":blocked\\n");
  process.exit(75);
}
try {
  await appendFile(log, mode + ":" + role + ":locked\\n");
  if (hold) await new Promise((resolve) => setTimeout(resolve, hold));
  if (fail) throw new Error("fixture failure");
  await appendFile(log, mode + ":" + role + ":mutated\\n");
} finally {
  await handle.close();
  await rm(lock, { force: true });
}
`;

async function runFixture(dir, mode, role, holdMs) {
  const script = join(dir, "fixture.mjs");
  const lock = join(dir, "deploy.lock");
  const log = join(dir, "events.log");
  await writeFile(script, fixture);
  const child = spawn(process.execPath, [script, mode, role], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log, HOLD_MS: String(holdMs) }, stdio: "ignore" });
  return child;
}

async function runFailingOwner(dir) {
  const script = join(dir, "fixture.mjs");
  const lock = join(dir, "deploy-failure.lock");
  const log = join(dir, "failure-events.log");
  await writeFile(script, fixture);
  const owner = spawn(process.execPath, [script, "deploy", "FAIL"], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log, FAIL_OWNER: "1" }, stdio: "ignore" });
  const ownerExit = await new Promise((resolve) => owner.once("exit", (code) => resolve(code)));
  assert.notEqual(ownerExit, 0, "failing owner must exit non-zero");
  const next = spawn(process.execPath, [script, "deploy", "NEXT"], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log }, stdio: "ignore" });
  const nextExit = await new Promise((resolve) => next.once("exit", (code) => resolve(code)));
  assert.equal(nextExit, 0, "lock must be released after owner failure");
  const events = readFileSync(log, "utf8");
  assert.match(events, /deploy:FAIL:locked/);
  assert.match(events, /deploy:NEXT:mutated/);
}

const dir = await mkdtemp(join((process.env.TEMP || process.env.TMP || "."), "ocg-deploy-regression-"));
try {
  await runFailingOwner(dir);
  for (const [first, second] of [["check", "check"], ["check", "deploy"], ["deploy", "check"], ["deploy", "deploy"]]) {
    const a = await runFixture(dir, first, "A", 250);
    for (let i = 0; i < 50; i += 1) {
      if (existsSync(join(dir, "events.log")) && readFileSync(join(dir, "events.log"), "utf8").includes(`${first}:A:locked`)) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const b = await runFixture(dir, second, "B", 0);
    const exitB = await new Promise((resolve) => b.once("exit", (code) => resolve(code)));
    assert.equal(exitB, 75, `${second} must lose lock contention`);
    const exitA = await new Promise((resolve) => a.once("exit", (code) => resolve(code)));
    assert.equal(exitA, 0, `${first} lock owner must complete`);
    const events = readFileSync(join(dir, "events.log"), "utf8");
    assert.match(events, new RegExp(`${first}:A:locked`));
    assert.match(events, new RegExp(`${first}:A:mutated`));
    assert.match(events, new RegExp(`${second}:B:blocked`));
    assert.doesNotMatch(events, new RegExp(`${second}:B:mutated`));
    await writeFile(join(dir, "events.log"), "");
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log("DEPLOYMENT_HARDENING_REGRESSION_OK · lock ordering · concurrency · identity binding");
