import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const packageJson = JSON.parse(root("package.json"));
const packageLock = JSON.parse(root("package-lock.json"));
const app = root("public/app.js");
const server = root("server/server.mjs");
const cosmetics = root("src/cosmetics.ts");

assert.equal(packageJson.version, "7.69.55");
assert.equal(packageLock.version, "7.69.55");
assert.equal(packageLock.packages[""].version, "7.69.55");
assert.match(server, /version: "7\.69\.55"/);
assert.match(server, /version:"7\.69\.55"/);
assert.match(packageJson.scripts.test, /dist\/test\/v76947\.test\.js/);
assert.equal(packageJson.scripts["ops:cosmetic-audit"], "node scripts/cosmetic-asset-audit.mjs");

for (const id of ["COS-BACK-001", "COS-BACK-002", "COS-BACK-003", "COS-BACK-004", "COS-BACK-005"])
  assert.match(cosmetics, new RegExp(id));
for (const id of ["COS-BADGE-001", "COS-BADGE-002", "COS-BADGE-003", "COS-BADGE-004", "COS-BADGE-005", "COS-BADGE-006"])
  assert.match(cosmetics, new RegExp(id));
assert.match(app, /roomCosmeticLoadout\(player\.id\)\.cardBackId/);
assert.match(app, /COS-BACK-004/);
assert.match(app, /COS-BACK-005/);

console.log("v7.69.55 cosmetic release markers passed.");
