import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const app = root("public/app.js");
const css = root("public/styles.css");
const server = root("server/server.mjs");
const packageJson = JSON.parse(root("package.json"));

assert.equal(packageJson.version, "7.69.54");
assert.match(server, /version: "7\.69\.54"/);
assert.match(server, /version:"7\.69\.54"/);
assert.match(app, /function appendEvents\(events = \[\], \{ present = true \} = \{\}\)/);
assert.match(app, /appendEvents\(view\.events, \{ present:!hydratingSession \}\)/);
assert.match(app, /state\.connectionStatus = 'RECOVERED'/);
assert.match(app, /RECOVERY_NOTICE_DELAY_MS = 800/);
assert.match(css, /\.connection-banner\.recovered/);

console.log("\n8/8 v7.69.46 recovery hardening markers passed.");
