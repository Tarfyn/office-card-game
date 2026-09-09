// Test-only child-process preload. No import or flag is added to the production tool/helper.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";

if (process.env.OCG_ALPHA_RESET_TEST !== "1") throw new Error("Reset interruption requires explicit test mode");
const target = resolve(process.env.OCG_TEST_RESET_STATE_PATH);
const phase = process.env.OCG_TEST_RESET_INTERRUPT_PHASE;
const rename = fs.renameSync;
const sync = fs.fsyncSync;
let syncCount = 0;
fs.fsyncSync = function (...args) { const result = sync(...args); syncCount++; return result; };
fs.renameSync = function (from, to) {
  const result = rename(from, to);
  if (resolve(String(to)) === target && JSON.parse(fs.readFileSync(target, "utf8")).phase === phase) {
    if (!syncCount) throw new Error("Recovery state was replaced without prior successful fsync");
    // No exception/finally cleanup: model process loss at the persisted boundary.
    process.exit(86);
  }
  return result;
};
syncBuiltinESMExports();
