import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (name: string) => readFileSync(fileURLToPath(new URL(`../../${name}`, import.meta.url)), "utf8");
const css = root("public/styles.css");
const packageJson = JSON.parse(root("package.json"));

assert.equal(packageJson.version, "7.69.36");
assert.match(css, /@media \(min-width:761px\) and \(max-width:2199px\) \{\s*\.collection-card \.catalog-name-row > strong \{ font-size:10\.4px; \}\s*\.collection-card \.catalog-name-row > strong\.long-name \{ font-size:9\.1px; \}\s*\}/);
assert.equal((css.match(/\.collection-card \.catalog-name-row > strong \{ font-size:10\.4px; \}/g) ?? []).length, 1);

console.log("\n3/3 v7.69.36 Deckbuilder typography tests passed.");
