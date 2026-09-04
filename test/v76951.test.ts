import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const server = read("server/server.mjs");
const deploy = read("ops/deploy.sh");
const helper = read("ops/ocg-db-helper");
const marker = read("deploy/postgres-persistence-ready");
const styles = read("public/styles.css");

assert.equal(packageJson.version, "7.69.54");
assert.equal(packageLock.version, "7.69.54");
assert.equal(packageLock.packages[""].version, "7.69.54");
assert.match(server, /version: "7\.69\.54"/);
assert.match(server, /version:"7\.69\.54"/);
assert.equal(marker.replace(/\r\n/g, "\n"), "OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1\n");
assert.match(helper, /CUTOVER_MARKER_REL="deploy\/postgres-persistence-ready"/);
assert.match(helper, /OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1/);

const finalize = deploy.indexOf('sudo -n "$RELEASE_HELPER" finalize "$RELEASE_NAME"');
const migrate = deploy.indexOf('sudo -n "$DB_HELPER" migrate "$RELEASE_NAME"');
const activate = deploy.indexOf('sudo -n "$RELEASE_HELPER" activate "$RELEASE_NAME"');
assert.ok(finalize >= 0 && finalize < migrate && migrate < activate);
assert.match(deploy, /systemctl is-active --quiet "\$SERVICE"/);
assert.match(deploy, /systemctl show -p MainPID --value "\$SERVICE"/);
assert.doesNotMatch(deploy, /\/proc\/\$pid\/cwd/);
assert.match(deploy, /for i in \$\(seq 1 30\)/);
assert.match(deploy, /for i in \$\(seq 1 20\)/);
assert.match(deploy, /npm ci --omit=dev/);
assert.doesNotMatch(deploy, /--exclude="\.\/node_modules"/);
assert.doesNotMatch(deploy, /"\$DB_HELPER" enable-postgres/);
assert.match(styles, /\.ops-header-actions button\{min-height:44px\}/);
assert.match(styles, /\.ops-header-actions \.ghost\{color:#ece7dc\}/);

console.log("v7.69.54 Starter Onboarding release-gate markers passed.");
