import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const packageJson = JSON.parse(read("package.json"));
const server = read("server/server.mjs");
const deploy = read("ops/office-card-game-deploy.sh");
const helper = read("ops/ocg-db-helper");
const marker = read("deploy/postgres-persistence-ready");

assert.equal(packageJson.version, "7.69.47");
assert.match(server, /version: "7\.69\.47"/);
assert.match(server, /version:"7\.69\.47"/);
assert.equal(marker, "OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1\n");
assert.match(helper, /CUTOVER_MARKER_REL="deploy\/postgres-persistence-ready"/);
assert.match(helper, /OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1/);

const finalize = deploy.indexOf('sudo -n "$RELEASE_HELPER" finalize "$RELEASE_NAME"');
const migrate = deploy.indexOf('sudo -n "$DB_HELPER" migrate "$RELEASE_NAME"');
const activate = deploy.indexOf('sudo -n "$RELEASE_HELPER" activate "$RELEASE_NAME"');
assert.ok(finalize >= 0 && finalize < migrate && migrate < activate);
assert.match(deploy, /npm ci --omit=dev/);
assert.doesNotMatch(deploy, /--exclude="\.\/node_modules"/);
assert.match(deploy, /node_modules\/argon2\/package\.json/);
assert.match(deploy, /node_modules\/pg\/package\.json/);
assert.doesNotMatch(deploy, /"\$DB_HELPER" enable-postgres/);

console.log("\n12/12 v7.69.47 PostgreSQL release-gate markers passed.");
