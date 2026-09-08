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

const fixture = String.raw`import { open, appendFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
const lock = process.env.LOCK_FILE;
const log = process.env.EVENT_LOG;
const ready = process.env.READY_FILE;
const release = process.env.RELEASE_FILE;
const mode = process.argv[2];
const role = process.argv[3];
const hold = Number(process.env.HOLD_MS || 0);
const holdUntilRelease = process.env.HOLD_UNTIL_RELEASE === "1";
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
  if (ready) await writeFile(ready, mode + ":" + role + ":ready\\n");
  if (holdUntilRelease) {
    while (!existsSync(release)) await new Promise((resolve) => setTimeout(resolve, 10));
  } else if (hold) await new Promise((resolve) => setTimeout(resolve, hold));
  if (fail) throw new Error("fixture failure");
  await appendFile(log, mode + ":" + role + ":mutated\\n");
} finally {
  await handle.close();
  await rm(lock, { force: true });
}
`;

async function runFixture(dir, mode, role, { holdMs = 0, holdUntilRelease = false } = {}) {
  const script = join(dir, "fixture.mjs");
  const lock = join(dir, "deploy.lock");
  const log = join(dir, "events.log");
  const ready = join(dir, `${mode}-${role}.ready`);
  const release = join(dir, `${mode}-${role}.release`);
  await writeFile(script, fixture);
  await rm(ready, { force:true });
  await rm(release, { force:true });
  const child = spawn(process.execPath, [script, mode, role], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log, READY_FILE: ready, RELEASE_FILE: release, HOLD_MS: String(holdMs), HOLD_UNTIL_RELEASE: holdUntilRelease ? "1" : "0" }, shell:false, stdio: "ignore" });
  return { child, ready, release };
}

async function waitForReady(owner, label) {
  const deadline = Date.now() + 5000;
  while (!existsSync(owner.ready)) {
    assert.equal(owner.child.exitCode, null, `${label} owner exited before READY`);
    if (Date.now() >= deadline) throw new Error(`${label} owner READY timeout`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(owner.child.exitCode, null, `${label} owner exited after READY`);
}

async function waitForExit(child) {
  if (child.exitCode !== null) return child.exitCode;
  return new Promise((resolve) => child.once("exit", (code) => resolve(code)));
}

async function runFailingOwner(dir) {
  const script = join(dir, "fixture.mjs");
  const lock = join(dir, "deploy-failure.lock");
  const log = join(dir, "failure-events.log");
  await writeFile(script, fixture);
  const owner = spawn(process.execPath, [script, "deploy", "FAIL"], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log, FAIL_OWNER: "1" }, shell:false, stdio: "ignore" });
  const ownerExit = await waitForExit(owner);
  assert.notEqual(ownerExit, 0, "failing owner must exit non-zero");
  const next = spawn(process.execPath, [script, "deploy", "NEXT"], { env: { ...process.env, LOCK_FILE: lock, EVENT_LOG: log }, shell:false, stdio: "ignore" });
  const nextExit = await waitForExit(next);
  assert.equal(nextExit, 0, "lock must be released after owner failure");
  const events = readFileSync(log, "utf8");
  assert.match(events, /deploy:FAIL:locked/);
  assert.match(events, /deploy:NEXT:mutated/);
}

const dir = await mkdtemp(join((process.env.TEMP || process.env.TMP || "."), "ocg-deploy-regression-"));
try {
  await runFailingOwner(dir);
  for (let iteration = 1; iteration <= 25; iteration += 1) {
    for (const [first, second] of [["check", "check"], ["check", "deploy"], ["deploy", "check"], ["deploy", "deploy"]]) {
      const owner = await runFixture(dir, first, "A", { holdUntilRelease:true });
      let b;
      try {
        await waitForReady(owner, `${first}:A iteration=${iteration}`);
        assert.equal(owner.child.exitCode, null, `${first} owner must remain alive while contender starts`);
        b = await runFixture(dir, second, "B");
        const exitB = await waitForExit(b.child);
        assert.equal(exitB, 75, `${second} must lose lock contention`);
        const events = readFileSync(join(dir, "events.log"), "utf8");
        assert.match(events, new RegExp(`${first}:A:locked`));
        assert.match(events, new RegExp(`${second}:B:blocked`));
        assert.doesNotMatch(events, new RegExp(`${second}:B:mutated`));
      } finally {
        await writeFile(owner.release, "release\n");
        const exitA = await waitForExit(owner.child);
        assert.equal(exitA, 0, `${first} lock owner must complete`);
        if (b && b.child.exitCode === null) b.child.kill();
      }
      const events = readFileSync(join(dir, "events.log"), "utf8");
      assert.match(events, new RegExp(`${first}:A:mutated`));
      await writeFile(join(dir, "events.log"), "");
    }
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log("DEPLOYMENT_HARDENING_REGRESSION_OK · lock ordering · concurrency · identity binding");
